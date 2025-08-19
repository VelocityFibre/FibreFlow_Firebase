const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize CORS with options
const corsHandler = cors({ origin: true });

// Ensure admin is initialized (it should be from index.js, but just in case)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * API endpoint for pole analytics
 * GET /poleAnalytics
 * 
 * Query parameters:
 * - projectId: Filter by specific project
 * - contractorId: Filter by specific contractor
 * - days: Number of days to look back (default: 30)
 * 
 * Example: https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalytics?days=7&projectId=xyz
 */
exports.poleAnalytics = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      // Only allow GET requests
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const db = admin.firestore();
      
      // Get query parameters
      const projectId = req.query.projectId;
      const contractorId = req.query.contractorId;
      const days = parseInt(req.query.days) || 30;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Build query
      let query = db.collection('planned-poles');
      
      if (projectId) {
        query = query.where('projectId', '==', projectId);
      }
      
      if (contractorId) {
        query = query.where('assignedContractorId', '==', contractorId);
      }

      // Get all poles
      const polesSnapshot = await query.get();
      const poles = polesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate statistics
      const stats = {
        totalPoles: poles.length,
        statusBreakdown: {
          planned: 0,
          assigned: 0,
          inProgress: 0,
          installed: 0,
          verified: 0,
          rejected: 0,
          cancelled: 0,
        },
        completionPercentage: 0,
        polesInstalledToday: 0,
        averagePolesPerDay: 0,
        contractorPerformance: [],
        projectProgress: [],
      };

      // Status breakdown
      const contractorMap = new Map();
      const projectMap = new Map();
      let installedCount = 0;
      let polesInDateRange = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      poles.forEach((pole) => {
        // Count by status
        switch (pole.status) {
          case 'planned':
            stats.statusBreakdown.planned++;
            break;
          case 'assigned':
            stats.statusBreakdown.assigned++;
            break;
          case 'in_progress':
            stats.statusBreakdown.inProgress++;
            break;
          case 'installed':
            stats.statusBreakdown.installed++;
            installedCount++;
            break;
          case 'verified':
            stats.statusBreakdown.verified++;
            installedCount++;
            break;
          case 'rejected':
            stats.statusBreakdown.rejected++;
            break;
          case 'cancelled':
            stats.statusBreakdown.cancelled++;
            break;
        }

        // Check if installed today
        if (pole.installedDate) {
          const installedDate = pole.installedDate.toDate ? pole.installedDate.toDate() : new Date(pole.installedDate);
          if (installedDate >= today) {
            stats.polesInstalledToday++;
          }
          if (installedDate >= startDate && installedDate <= endDate) {
            polesInDateRange++;
          }
        }

        // Contractor performance
        if (pole.assignedContractorId) {
          if (!contractorMap.has(pole.assignedContractorId)) {
            contractorMap.set(pole.assignedContractorId, {
              id: pole.assignedContractorId,
              name: pole.assignedContractorName || 'Unknown',
              assigned: 0,
              completed: 0,
            });
          }
          const contractor = contractorMap.get(pole.assignedContractorId);
          contractor.assigned++;
          if (pole.status === 'installed' || pole.status === 'verified') {
            contractor.completed++;
          }
        }

        // Project progress
        if (pole.projectId) {
          if (!projectMap.has(pole.projectId)) {
            projectMap.set(pole.projectId, {
              id: pole.projectId,
              name: pole.projectName || 'Unknown',
              code: pole.projectCode || 'N/A',
              total: 0,
              installed: 0,
            });
          }
          const project = projectMap.get(pole.projectId);
          project.total++;
          if (pole.status === 'installed' || pole.status === 'verified') {
            project.installed++;
          }
        }
      });

      // Calculate completion percentage
      stats.completionPercentage = stats.totalPoles > 0 
        ? parseFloat(((installedCount / stats.totalPoles) * 100).toFixed(2))
        : 0;

      // Calculate average poles per day
      stats.averagePolesPerDay = days > 0 ? parseFloat((polesInDateRange / days).toFixed(2)) : 0;

      // Format contractor performance
      stats.contractorPerformance = Array.from(contractorMap.values()).map(contractor => ({
        name: contractor.name,
        assigned: contractor.assigned,
        completed: contractor.completed,
        completionRate: contractor.assigned > 0 
          ? parseFloat(((contractor.completed / contractor.assigned) * 100).toFixed(2))
          : 0,
      }));

      // Format project progress
      stats.projectProgress = Array.from(projectMap.values()).map(project => ({
        name: project.name,
        code: project.code,
        total: project.total,
        installed: project.installed,
        progressPercentage: project.total > 0 
          ? parseFloat(((project.installed / project.total) * 100).toFixed(2))
          : 0,
      }));

      // Return the analytics data
      res.status(200).json({
        success: true,
        data: stats,
        metadata: {
          generatedAt: new Date().toISOString(),
          filters: {
            projectId: projectId || 'all',
            contractorId: contractorId || 'all',
            daysIncluded: days,
          },
        },
      });

    } catch (error) {
      console.error('Error in poleAnalytics function:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pole analytics',
        message: error.message || 'Unknown error',
      });
    }
  });
});

/**
 * Lightweight version for real-time dashboards
 * GET /poleAnalyticsSummary
 * 
 * Example: https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsSummary
 */
exports.poleAnalyticsSummary = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const db = admin.firestore();
      
      // Get counts by status using aggregation queries
      const totalSnapshot = await db.collection('planned-poles').count().get();
      const totalPoles = totalSnapshot.data().count;

      // Get specific status counts
      const [
        installedSnapshot,
        verifiedSnapshot,
        inProgressSnapshot,
        assignedSnapshot,
        plannedSnapshot
      ] = await Promise.all([
        db.collection('planned-poles').where('status', '==', 'installed').count().get(),
        db.collection('planned-poles').where('status', '==', 'verified').count().get(),
        db.collection('planned-poles').where('status', '==', 'in_progress').count().get(),
        db.collection('planned-poles').where('status', '==', 'assigned').count().get(),
        db.collection('planned-poles').where('status', '==', 'planned').count().get()
      ]);
      
      const installedCount = installedSnapshot.data().count;
      const verifiedCount = verifiedSnapshot.data().count;
      const completedPoles = installedCount + verifiedCount;
      const completionPercentage = totalPoles > 0 ? (completedPoles / totalPoles) * 100 : 0;

      res.status(200).json({
        success: true,
        data: {
          totalPoles,
          completedPoles,
          remainingPoles: totalPoles - completedPoles,
          completionPercentage: parseFloat(completionPercentage.toFixed(2)),
          statusCounts: {
            planned: plannedSnapshot.data().count,
            assigned: assignedSnapshot.data().count,
            inProgress: inProgressSnapshot.data().count,
            installed: installedCount,
            verified: verifiedCount,
          },
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error in poleAnalyticsSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch summary',
        message: error.message || 'Unknown error',
      });
    }
  });
});
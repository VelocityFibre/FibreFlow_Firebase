import { Router } from 'express';
import { sql } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { cacheMiddleware } from '../middleware/cache';
import { validateQuery } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  projectId: Joi.string().optional(),
  contractorId: Joi.string().optional()
});

// GET /api/v1/analytics/dashboard
router.get('/dashboard', cacheMiddleware(300), asyncHandler(async (req, res) => {
  // Overall dashboard stats
  const statsQuery = `
    WITH project_stats AS (
      SELECT 
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects
      FROM projects p
    ),
    pole_stats AS (
      SELECT 
        COUNT(*) as total_poles,
        COUNT(CASE WHEN status = 'installed' THEN 1 END) as installed_poles,
        COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned_poles,
        COUNT(CASE WHEN installation_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as poles_last_7_days,
        COUNT(CASE WHEN installation_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as poles_last_30_days
      FROM poles
    ),
    contractor_stats AS (
      SELECT 
        COUNT(DISTINCT contractor_id) as active_contractors
      FROM poles
      WHERE installation_date >= CURRENT_DATE - INTERVAL '30 days'
    )
    SELECT 
      ps.*,
      pl.*,
      cs.*,
      ROUND(
        CASE 
          WHEN pl.total_poles > 0 
          THEN (pl.installed_poles::numeric / pl.total_poles * 100)
          ELSE 0 
        END, 2
      ) as completion_percentage
    FROM project_stats ps, pole_stats pl, contractor_stats cs
  `;
  
  const stats = await sql(statsQuery);
  
  // Recent activity
  const recentActivityQuery = `
    SELECT 
      'pole_installed' as activity_type,
      pole_number as reference,
      installation_date as activity_date,
      c.name as contractor_name
    FROM poles p
    LEFT JOIN contractors c ON p.contractor_id = c.id
    WHERE installation_date IS NOT NULL
    ORDER BY installation_date DESC
    LIMIT 10
  `;
  
  const recentActivity = await sql(recentActivityQuery);
  
  res.json({
    success: true,
    data: {
      statistics: stats[0],
      recentActivity,
      lastUpdated: new Date().toISOString()
    },
    meta: {
      cached: true,
      cacheExpiry: 300,
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/v1/analytics/daily-progress
router.get('/daily-progress', asyncHandler(async (req, res) => {
  const query = validateQuery(req.query, dateRangeSchema);
  
  const conditions = [];
  const params = [];
  
  params.push(query.startDate, query.endDate);
  conditions.push('installation_date BETWEEN $1 AND $2');
  
  if (query.projectId) {
    conditions.push(`project_id = $${params.length + 1}`);
    params.push(query.projectId);
  }
  
  if (query.contractorId) {
    conditions.push(`contractor_id = $${params.length + 1}`);
    params.push(query.contractorId);
  }
  
  const whereClause = conditions.join(' AND ');
  
  const progressQuery = `
    SELECT 
      DATE(installation_date) as date,
      COUNT(*) as poles_installed,
      COUNT(DISTINCT contractor_id) as contractors_active,
      COUNT(DISTINCT project_id) as projects_active,
      ARRAY_AGG(DISTINCT pole_number ORDER BY pole_number) as pole_numbers
    FROM poles
    WHERE ${whereClause}
    GROUP BY DATE(installation_date)
    ORDER BY date ASC
  `;
  
  const dailyProgress = await sql(progressQuery, params);
  
  // Calculate cumulative progress
  let cumulative = 0;
  const progressWithCumulative = dailyProgress.map(day => {
    cumulative += day.poles_installed;
    return {
      ...day,
      cumulative_total: cumulative
    };
  });
  
  res.json({
    success: true,
    data: progressWithCumulative,
    meta: {
      startDate: query.startDate,
      endDate: query.endDate,
      totalDays: dailyProgress.length,
      totalPoles: cumulative,
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/v1/analytics/contractor-performance
router.get('/contractor-performance', cacheMiddleware(600), asyncHandler(async (req, res) => {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const performanceQuery = `
    WITH contractor_stats AS (
      SELECT 
        c.id,
        c.name,
        c.company_name,
        COUNT(p.id) as total_poles_installed,
        COUNT(DISTINCT p.project_id) as projects_worked,
        COUNT(DISTINCT DATE(p.installation_date)) as days_worked,
        MIN(p.installation_date) as first_installation,
        MAX(p.installation_date) as last_installation,
        AVG(
          CASE 
            WHEN p.installation_date IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (p.installation_date - p.created_at)) / 86400
            ELSE NULL 
          END
        ) as avg_days_to_install
      FROM contractors c
      LEFT JOIN poles p ON c.id = p.contractor_id
      WHERE p.installation_date >= $1
      GROUP BY c.id, c.name, c.company_name
    ),
    ranked_contractors AS (
      SELECT 
        *,
        RANK() OVER (ORDER BY total_poles_installed DESC) as installation_rank,
        ROUND(total_poles_installed::numeric / NULLIF(days_worked, 0), 2) as daily_average
      FROM contractor_stats
      WHERE total_poles_installed > 0
    )
    SELECT * FROM ranked_contractors
    ORDER BY installation_rank ASC
    LIMIT 20
  `;
  
  const performance = await sql(performanceQuery, [last30Days.toISOString()]);
  
  res.json({
    success: true,
    data: performance,
    meta: {
      period: 'last_30_days',
      cached: true,
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/v1/analytics/project-summary/:projectId
router.get('/project-summary/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  const summaryQuery = `
    WITH project_info AS (
      SELECT 
        p.name,
        p.status,
        p.start_date,
        p.end_date,
        p.budget,
        c.name as client_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.id = $1
    ),
    pole_summary AS (
      SELECT 
        COUNT(*) as total_poles,
        COUNT(CASE WHEN status = 'installed' THEN 1 END) as installed,
        COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as in_progress,
        COUNT(DISTINCT contractor_id) as contractors_used,
        MIN(installation_date) as first_installation,
        MAX(installation_date) as last_installation
      FROM poles
      WHERE project_id = $1
    ),
    contractor_breakdown AS (
      SELECT 
        c.name as contractor_name,
        COUNT(*) as poles_installed,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (installation_date - created_at)) / 86400
        ), 2) as avg_installation_days
      FROM poles p
      JOIN contractors c ON p.contractor_id = c.id
      WHERE p.project_id = $1 AND p.installation_date IS NOT NULL
      GROUP BY c.name
      ORDER BY poles_installed DESC
    )
    SELECT 
      pi.*,
      ps.*,
      COALESCE(json_agg(cb.*) FILTER (WHERE cb.contractor_name IS NOT NULL), '[]') as contractor_breakdown,
      ROUND(
        CASE 
          WHEN ps.total_poles > 0 
          THEN (ps.installed::numeric / ps.total_poles * 100)
          ELSE 0 
        END, 2
      ) as completion_percentage
    FROM project_info pi, pole_summary ps
    LEFT JOIN contractor_breakdown cb ON true
    GROUP BY 
      pi.name, pi.status, pi.start_date, pi.end_date, pi.budget, pi.client_name,
      ps.total_poles, ps.installed, ps.planned, ps.in_progress, 
      ps.contractors_used, ps.first_installation, ps.last_installation
  `;
  
  const result = await sql(summaryQuery, [projectId]);
  
  if (result.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Project not found'
      }
    });
  }
  
  res.json({
    success: true,
    data: result[0],
    meta: {
      projectId,
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/v1/analytics/heatmap
router.get('/heatmap', cacheMiddleware(1800), asyncHandler(async (req, res) => {
  const heatmapQuery = `
    SELECT 
      ROUND(gps_latitude::numeric, 3) as lat,
      ROUND(gps_longitude::numeric, 3) as lng,
      COUNT(*) as pole_count,
      COUNT(CASE WHEN status = 'installed' THEN 1 END) as installed_count,
      ARRAY_AGG(DISTINCT project_id) as project_ids
    FROM poles
    WHERE gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL
    GROUP BY ROUND(gps_latitude::numeric, 3), ROUND(gps_longitude::numeric, 3)
    HAVING COUNT(*) > 1
    ORDER BY pole_count DESC
    LIMIT 1000
  `;
  
  const heatmapData = await sql(heatmapQuery);
  
  res.json({
    success: true,
    data: heatmapData,
    meta: {
      type: 'density_heatmap',
      cached: true,
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;
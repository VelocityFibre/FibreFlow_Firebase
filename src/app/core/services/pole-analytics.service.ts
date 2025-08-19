import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  QueryConstraint,
  Timestamp,
  getCountFromServer,
  CollectionReference,
  DocumentData,
} from '@angular/fire/firestore';
import { Observable, from, map, combineLatest, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { PlannedPole, PlannedPoleStatus, PoleInstallation } from '@app/features/pole-tracker/models/mobile-pole-tracker.model';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

export interface PoleAnalytics {
  // Overall Statistics
  totalPoles: number;
  statusBreakdown: StatusBreakdown;
  
  // Installation Progress
  installationProgress: InstallationProgress;
  
  // Time-based Analytics
  dailyStats: DailyStats;
  weeklyStats: WeeklyStats;
  monthlyStats: MonthlyStats;
  
  // Contractor Performance
  contractorStats: ContractorStats[];
  
  // Project Breakdown
  projectStats: ProjectStats[];
  
  // Geographic Distribution
  geographicStats: GeographicStats;
  
  // Quality Metrics
  qualityMetrics: QualityMetrics;
  
  // Productivity Metrics
  productivityMetrics: ProductivityMetrics;
}

export interface StatusBreakdown {
  planned: number;
  assigned: number;
  inProgress: number;
  installed: number;
  verified: number;
  rejected: number;
  cancelled: number;
}

export interface InstallationProgress {
  totalTarget: number;
  completed: number;
  completionPercentage: number;
  remaining: number;
  projectedCompletionDate?: Date;
  averageInstallationRate: number; // poles per day
}

export interface DailyStats {
  date: Date;
  polesInstalled: number;
  polesVerified: number;
  polesRejected: number;
  newAssignments: number;
}

export interface WeeklyStats {
  weekStartDate: Date;
  weekEndDate: Date;
  totalInstalled: number;
  dailyAverage: number;
  topContractor: string;
  topProject: string;
}

export interface MonthlyStats {
  month: string;
  year: number;
  totalInstalled: number;
  totalVerified: number;
  rejectionRate: number;
  growthRate: number; // compared to previous month
}

export interface ContractorStats {
  contractorId: string;
  contractorName: string;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;
  averageInstallationTime: number; // in hours
  rejectionRate: number;
  currentActiveAssignments: number;
  lastActivityDate?: Date;
}

export interface ProjectStats {
  projectId: string;
  projectName: string;
  projectCode: string;
  totalPoles: number;
  installedPoles: number;
  progressPercentage: number;
  averageInstallationRate: number;
  estimatedCompletionDate?: Date;
  statusBreakdown: StatusBreakdown;
}

export interface GeographicStats {
  centerPoint: { lat: number; lng: number };
  radius: number; // in km
  polesByArea: AreaStats[];
  heatmapData: HeatmapPoint[];
}

export interface AreaStats {
  areaName: string;
  bounds: { north: number; south: number; east: number; west: number };
  poleCount: number;
  completionRate: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number; // number of poles in this area
}

export interface QualityMetrics {
  overallQualityScore: number; // 0-100
  photoCompletionRate: number;
  locationAccuracyRate: number;
  firstTimeApprovalRate: number;
  averageRejectionReasons: { reason: string; count: number }[];
}

export interface ProductivityMetrics {
  averagePolesPerDay: number;
  averagePolesPerContractor: number;
  peakProductivityDay: { date: Date; count: number };
  productivityTrend: 'increasing' | 'stable' | 'decreasing';
  estimatedDaysToCompletion: number;
}

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

export interface PoleFilter {
  projectIds?: string[];
  contractorIds?: string[];
  statuses?: PlannedPoleStatus[];
  dateRange?: DateRangeFilter;
}

@Injectable({
  providedIn: 'root',
})
export class PoleAnalyticsService {
  private firestore = inject(Firestore);
  private plannedPolesCollection: CollectionReference<DocumentData>;
  private poleInstallationsCollection: CollectionReference<DocumentData>;

  constructor() {
    this.plannedPolesCollection = collection(this.firestore, 'planned-poles');
    this.poleInstallationsCollection = collection(this.firestore, 'pole-installations');
  }

  /**
   * Get comprehensive analytics for poles
   */
  getComprehensiveAnalytics(filter?: PoleFilter): Observable<PoleAnalytics> {
    return combineLatest([
      this.getStatusBreakdown(filter),
      this.getInstallationProgress(filter),
      this.getDailyStats(new Date(), filter),
      this.getWeeklyStats(new Date(), filter),
      this.getMonthlyStats(new Date(), filter),
      this.getContractorStats(filter),
      this.getProjectStats(filter),
      this.getQualityMetrics(filter),
      this.getProductivityMetrics(filter),
    ]).pipe(
      map(([
        statusBreakdown,
        installationProgress,
        dailyStats,
        weeklyStats,
        monthlyStats,
        contractorStats,
        projectStats,
        qualityMetrics,
        productivityMetrics,
      ]) => ({
        totalPoles: this.sumStatusBreakdown(statusBreakdown),
        statusBreakdown,
        installationProgress,
        dailyStats,
        weeklyStats,
        monthlyStats,
        contractorStats,
        projectStats,
        geographicStats: this.getEmptyGeographicStats(), // Placeholder for now
        qualityMetrics,
        productivityMetrics,
      })),
      catchError((error) => {
        console.error('Error getting pole analytics:', error);
        return of(this.getEmptyAnalytics());
      })
    );
  }

  /**
   * Get status breakdown of all poles
   */
  private getStatusBreakdown(filter?: PoleFilter): Observable<StatusBreakdown> {
    return from(this.queryPoles(filter)).pipe(
      map((poles) => {
        const breakdown: StatusBreakdown = {
          planned: 0,
          assigned: 0,
          inProgress: 0,
          installed: 0,
          verified: 0,
          rejected: 0,
          cancelled: 0,
        };

        poles.forEach((pole) => {
          const status = pole['status'] as PlannedPoleStatus;
          switch (status) {
            case PlannedPoleStatus.PLANNED:
              breakdown.planned++;
              break;
            case PlannedPoleStatus.ASSIGNED:
              breakdown.assigned++;
              break;
            case PlannedPoleStatus.IN_PROGRESS:
              breakdown.inProgress++;
              break;
            case PlannedPoleStatus.INSTALLED:
              breakdown.installed++;
              break;
            case PlannedPoleStatus.VERIFIED:
              breakdown.verified++;
              break;
            case PlannedPoleStatus.REJECTED:
              breakdown.rejected++;
              break;
            case PlannedPoleStatus.CANCELLED:
              breakdown.cancelled++;
              break;
          }
        });

        return breakdown;
      })
    );
  }

  /**
   * Get installation progress metrics
   */
  private getInstallationProgress(filter?: PoleFilter): Observable<InstallationProgress> {
    return from(this.queryPoles(filter)).pipe(
      map((poles) => {
        const totalTarget = poles.length;
        const completed = poles.filter(
          (p) => p['status'] === PlannedPoleStatus.INSTALLED || p['status'] === PlannedPoleStatus.VERIFIED
        ).length;
        const completionPercentage = totalTarget > 0 ? (completed / totalTarget) * 100 : 0;
        const remaining = totalTarget - completed;

        // Calculate average installation rate (last 30 days)
        const thirtyDaysAgo = subDays(new Date(), 30);
        const recentInstallations = poles.filter((p) => {
          const installedDate = p['installedDate'];
          if (!installedDate) return false;
          const date = installedDate instanceof Timestamp ? installedDate.toDate() : installedDate;
          return date >= thirtyDaysAgo;
        }).length;

        const averageInstallationRate = recentInstallations / 30;

        // Project completion date
        let projectedCompletionDate: Date | undefined;
        if (averageInstallationRate > 0 && remaining > 0) {
          const daysToComplete = Math.ceil(remaining / averageInstallationRate);
          projectedCompletionDate = new Date();
          projectedCompletionDate.setDate(projectedCompletionDate.getDate() + daysToComplete);
        }

        return {
          totalTarget,
          completed,
          completionPercentage,
          remaining,
          projectedCompletionDate,
          averageInstallationRate,
        };
      })
    );
  }

  /**
   * Get daily statistics
   */
  private getDailyStats(date: Date, filter?: PoleFilter): Observable<DailyStats> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return from(this.queryPoles(filter)).pipe(
      map((poles) => {
        let polesInstalled = 0;
        let polesVerified = 0;
        let polesRejected = 0;
        let newAssignments = 0;

        poles.forEach((pole) => {
          // Check if status changed today
          const statusHistory = pole['statusHistory'] as any[] || [];
          statusHistory.forEach((entry) => {
            const changeDate = entry.timestamp instanceof Timestamp ? entry.timestamp.toDate() : entry.timestamp;
            if (changeDate >= dayStart && changeDate <= dayEnd) {
              switch (entry.newStatus) {
                case PlannedPoleStatus.INSTALLED:
                  polesInstalled++;
                  break;
                case PlannedPoleStatus.VERIFIED:
                  polesVerified++;
                  break;
                case PlannedPoleStatus.REJECTED:
                  polesRejected++;
                  break;
                case PlannedPoleStatus.ASSIGNED:
                  newAssignments++;
                  break;
              }
            }
          });
        });

        return {
          date,
          polesInstalled,
          polesVerified,
          polesRejected,
          newAssignments,
        };
      })
    );
  }

  /**
   * Get weekly statistics
   */
  private getWeeklyStats(date: Date, filter?: PoleFilter): Observable<WeeklyStats> {
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);

    return from(this.queryPoles(filter)).pipe(
      map((poles) => {
        let totalInstalled = 0;
        const contractorCount: Record<string, number> = {};
        const projectCount: Record<string, number> = {};

        poles.forEach((pole) => {
          const installedDate = pole['installedDate'];
          if (installedDate) {
            const date = installedDate instanceof Timestamp ? installedDate.toDate() : installedDate;
            if (date >= weekStart && date <= weekEnd) {
              totalInstalled++;
              
              // Track contractor performance
              const contractorName = pole['assignedContractorName'] || 'Unknown';
              contractorCount[contractorName] = (contractorCount[contractorName] || 0) + 1;
              
              // Track project progress
              const projectName = pole['projectName'] || 'Unknown';
              projectCount[projectName] = (projectCount[projectName] || 0) + 1;
            }
          }
        });

        const dailyAverage = totalInstalled / 7;
        const topContractor = Object.entries(contractorCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
        const topProject = Object.entries(projectCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

        return {
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          totalInstalled,
          dailyAverage,
          topContractor,
          topProject,
        };
      })
    );
  }

  /**
   * Get monthly statistics
   */
  private getMonthlyStats(date: Date, filter?: PoleFilter): Observable<MonthlyStats> {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const previousMonthStart = startOfMonth(subDays(monthStart, 1));
    const previousMonthEnd = endOfMonth(subDays(monthStart, 1));

    return from(this.queryPoles(filter)).pipe(
      map((poles) => {
        let totalInstalled = 0;
        let totalVerified = 0;
        let totalRejected = 0;
        let previousMonthInstalled = 0;

        poles.forEach((pole) => {
          const statusHistory = pole['statusHistory'] as any[] || [];
          
          statusHistory.forEach((entry) => {
            const changeDate = entry.timestamp instanceof Timestamp ? entry.timestamp.toDate() : entry.timestamp;
            
            // Current month stats
            if (changeDate >= monthStart && changeDate <= monthEnd) {
              switch (entry.newStatus) {
                case PlannedPoleStatus.INSTALLED:
                  totalInstalled++;
                  break;
                case PlannedPoleStatus.VERIFIED:
                  totalVerified++;
                  break;
                case PlannedPoleStatus.REJECTED:
                  totalRejected++;
                  break;
              }
            }
            
            // Previous month stats for growth calculation
            if (changeDate >= previousMonthStart && changeDate <= previousMonthEnd) {
              if (entry.newStatus === PlannedPoleStatus.INSTALLED) {
                previousMonthInstalled++;
              }
            }
          });
        });

        const rejectionRate = totalInstalled > 0 ? (totalRejected / totalInstalled) * 100 : 0;
        const growthRate = previousMonthInstalled > 0 
          ? ((totalInstalled - previousMonthInstalled) / previousMonthInstalled) * 100 
          : 0;

        return {
          month: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          totalInstalled,
          totalVerified,
          rejectionRate,
          growthRate,
        };
      })
    );
  }

  /**
   * Get contractor performance statistics
   */
  private getContractorStats(filter?: PoleFilter): Observable<ContractorStats[]> {
    return from(this.queryPoles(filter)).pipe(
      map((poles) => {
        const contractorMap: Record<string, ContractorStats> = {};

        poles.forEach((pole) => {
          const contractorId = pole['assignedContractorId'];
          const contractorName = pole['assignedContractorName'] || 'Unknown';
          
          if (!contractorId) return;

          if (!contractorMap[contractorId]) {
            contractorMap[contractorId] = {
              contractorId,
              contractorName,
              totalAssigned: 0,
              totalCompleted: 0,
              completionRate: 0,
              averageInstallationTime: 0,
              rejectionRate: 0,
              currentActiveAssignments: 0,
              lastActivityDate: undefined,
            };
          }

          const stats = contractorMap[contractorId];
          stats.totalAssigned++;

          const status = pole['status'] as PlannedPoleStatus;
          if (status === PlannedPoleStatus.INSTALLED || status === PlannedPoleStatus.VERIFIED) {
            stats.totalCompleted++;
          } else if (status === PlannedPoleStatus.ASSIGNED || status === PlannedPoleStatus.IN_PROGRESS) {
            stats.currentActiveAssignments++;
          }

          // Track last activity
          const statusHistory = pole['statusHistory'] as any[] || [];
          if (statusHistory.length > 0) {
            const lastEntry = statusHistory[statusHistory.length - 1];
            const lastDate = lastEntry.timestamp instanceof Timestamp 
              ? lastEntry.timestamp.toDate() 
              : lastEntry.timestamp;
            
            if (!stats.lastActivityDate || lastDate > stats.lastActivityDate) {
              stats.lastActivityDate = lastDate;
            }
          }
        });

        // Calculate rates
        return Object.values(contractorMap).map((stats) => ({
          ...stats,
          completionRate: stats.totalAssigned > 0 ? (stats.totalCompleted / stats.totalAssigned) * 100 : 0,
        }));
      })
    );
  }

  /**
   * Get project-wise statistics
   */
  private getProjectStats(filter?: PoleFilter): Observable<ProjectStats[]> {
    return from(this.queryPoles(filter)).pipe(
      map((poles) => {
        const projectMap: Record<string, ProjectStats> = {};

        poles.forEach((pole) => {
          const projectId = pole['projectId'];
          const projectName = pole['projectName'] || 'Unknown';
          const projectCode = pole['projectCode'] || 'N/A';
          
          if (!projectId) return;

          if (!projectMap[projectId]) {
            projectMap[projectId] = {
              projectId,
              projectName,
              projectCode,
              totalPoles: 0,
              installedPoles: 0,
              progressPercentage: 0,
              averageInstallationRate: 0,
              estimatedCompletionDate: undefined,
              statusBreakdown: {
                planned: 0,
                assigned: 0,
                inProgress: 0,
                installed: 0,
                verified: 0,
                rejected: 0,
                cancelled: 0,
              },
            };
          }

          const stats = projectMap[projectId];
          stats.totalPoles++;

          const status = pole['status'] as PlannedPoleStatus;
          
          // Update status breakdown
          switch (status) {
            case PlannedPoleStatus.PLANNED:
              stats.statusBreakdown.planned++;
              break;
            case PlannedPoleStatus.ASSIGNED:
              stats.statusBreakdown.assigned++;
              break;
            case PlannedPoleStatus.IN_PROGRESS:
              stats.statusBreakdown.inProgress++;
              break;
            case PlannedPoleStatus.INSTALLED:
              stats.statusBreakdown.installed++;
              stats.installedPoles++;
              break;
            case PlannedPoleStatus.VERIFIED:
              stats.statusBreakdown.verified++;
              stats.installedPoles++;
              break;
            case PlannedPoleStatus.REJECTED:
              stats.statusBreakdown.rejected++;
              break;
            case PlannedPoleStatus.CANCELLED:
              stats.statusBreakdown.cancelled++;
              break;
          }
        });

        // Calculate progress percentages
        return Object.values(projectMap).map((stats) => ({
          ...stats,
          progressPercentage: stats.totalPoles > 0 ? (stats.installedPoles / stats.totalPoles) * 100 : 0,
        }));
      })
    );
  }

  /**
   * Get quality metrics
   */
  private getQualityMetrics(filter?: PoleFilter): Observable<QualityMetrics> {
    return from(this.queryPoles(filter)).pipe(
      switchMap((poles) => {
        // Also query pole installations for quality data
        return from(this.queryPoleInstallations(filter)).pipe(
          map((installations) => {
            let totalWithPhotos = 0;
            let totalWithAccurateLocation = 0;
            let totalFirstTimeApproval = 0;
            let totalEvaluated = 0;
            const rejectionReasons: Record<string, number> = {};

            installations.forEach((installation) => {
              totalEvaluated++;

              // Check photo completion
              const photos = installation['photos'] || {};
              const requiredPhotos = ['before', 'front', 'side', 'depth', 'concrete', 'compaction'];
              const hasAllPhotos = requiredPhotos.every((type) => photos[type]?.uploaded);
              if (hasAllPhotos) {
                totalWithPhotos++;
              }

              // Check location accuracy
              const locationDeviation = installation['locationDeviation'] || 0;
              if (locationDeviation < 10) { // Within 10 meters
                totalWithAccurateLocation++;
              }

              // Check verification status
              const verificationStatus = installation['verificationStatus'];
              if (verificationStatus === 'approved') {
                totalFirstTimeApproval++;
              } else if (verificationStatus === 'rejected') {
                const reason = installation['rejectionReason'] || 'Unknown';
                rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
              }
            });

            const photoCompletionRate = totalEvaluated > 0 ? (totalWithPhotos / totalEvaluated) * 100 : 0;
            const locationAccuracyRate = totalEvaluated > 0 ? (totalWithAccurateLocation / totalEvaluated) * 100 : 0;
            const firstTimeApprovalRate = totalEvaluated > 0 ? (totalFirstTimeApproval / totalEvaluated) * 100 : 0;

            const overallQualityScore = (photoCompletionRate + locationAccuracyRate + firstTimeApprovalRate) / 3;

            const averageRejectionReasons = Object.entries(rejectionReasons)
              .map(([reason, count]) => ({ reason, count }))
              .sort((a, b) => b.count - a.count);

            return {
              overallQualityScore,
              photoCompletionRate,
              locationAccuracyRate,
              firstTimeApprovalRate,
              averageRejectionReasons,
            };
          })
        );
      })
    );
  }

  /**
   * Get productivity metrics
   */
  private getProductivityMetrics(filter?: PoleFilter): Observable<ProductivityMetrics> {
    return from(this.queryPoles(filter)).pipe(
      map((poles) => {
        const dailyInstallations: Record<string, number> = {};
        const contractorInstallations: Record<string, number> = {};
        let totalInstalled = 0;
        let totalRemaining = 0;

        poles.forEach((pole) => {
          const status = pole['status'] as PlannedPoleStatus;
          
          if (status === PlannedPoleStatus.INSTALLED || status === PlannedPoleStatus.VERIFIED) {
            totalInstalled++;
            
            const installedDate = pole['installedDate'];
            if (installedDate) {
              const date = installedDate instanceof Timestamp ? installedDate.toDate() : installedDate;
              const dateKey = date.toISOString().split('T')[0];
              dailyInstallations[dateKey] = (dailyInstallations[dateKey] || 0) + 1;
            }

            const contractorId = pole['assignedContractorId'];
            if (contractorId) {
              contractorInstallations[contractorId] = (contractorInstallations[contractorId] || 0) + 1;
            }
          } else if (status !== PlannedPoleStatus.CANCELLED && status !== PlannedPoleStatus.REJECTED) {
            totalRemaining++;
          }
        });

        // Calculate metrics
        const totalDays = Object.keys(dailyInstallations).length;
        const averagePolesPerDay = totalDays > 0 ? totalInstalled / totalDays : 0;
        
        const totalContractors = Object.keys(contractorInstallations).length;
        const averagePolesPerContractor = totalContractors > 0 ? totalInstalled / totalContractors : 0;

        // Find peak productivity day
        let peakDay = { date: new Date(), count: 0 };
        Object.entries(dailyInstallations).forEach(([dateStr, count]) => {
          if (count > peakDay.count) {
            peakDay = { date: new Date(dateStr), count };
          }
        });

        // Calculate productivity trend (last 7 days vs previous 7 days)
        const today = new Date();
        const sevenDaysAgo = subDays(today, 7);
        const fourteenDaysAgo = subDays(today, 14);
        
        let lastWeekCount = 0;
        let previousWeekCount = 0;
        
        Object.entries(dailyInstallations).forEach(([dateStr, count]) => {
          const date = new Date(dateStr);
          if (date >= sevenDaysAgo) {
            lastWeekCount += count;
          } else if (date >= fourteenDaysAgo) {
            previousWeekCount += count;
          }
        });

        let productivityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
        if (lastWeekCount > previousWeekCount * 1.1) {
          productivityTrend = 'increasing';
        } else if (lastWeekCount < previousWeekCount * 0.9) {
          productivityTrend = 'decreasing';
        }

        const estimatedDaysToCompletion = averagePolesPerDay > 0 
          ? Math.ceil(totalRemaining / averagePolesPerDay) 
          : 0;

        return {
          averagePolesPerDay,
          averagePolesPerContractor,
          peakProductivityDay: peakDay,
          productivityTrend,
          estimatedDaysToCompletion,
        };
      })
    );
  }

  /**
   * Query poles with filters
   */
  private async queryPoles(filter?: PoleFilter): Promise<any[]> {
    const constraints: QueryConstraint[] = [];

    if (filter?.projectIds && filter.projectIds.length > 0) {
      constraints.push(where('projectId', 'in', filter.projectIds));
    }

    if (filter?.contractorIds && filter.contractorIds.length > 0) {
      constraints.push(where('assignedContractorId', 'in', filter.contractorIds));
    }

    if (filter?.statuses && filter.statuses.length > 0) {
      constraints.push(where('status', 'in', filter.statuses));
    }

    const q = query(this.plannedPolesCollection, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Query pole installations with filters
   */
  private async queryPoleInstallations(filter?: PoleFilter): Promise<any[]> {
    const constraints: QueryConstraint[] = [];

    if (filter?.projectIds && filter.projectIds.length > 0) {
      constraints.push(where('projectId', 'in', filter.projectIds));
    }

    if (filter?.contractorIds && filter.contractorIds.length > 0) {
      constraints.push(where('contractorId', 'in', filter.contractorIds));
    }

    const q = query(this.poleInstallationsCollection, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Helper methods
   */
  private sumStatusBreakdown(breakdown: StatusBreakdown): number {
    return Object.values(breakdown).reduce((sum, count) => sum + count, 0);
  }

  private getEmptyAnalytics(): PoleAnalytics {
    return {
      totalPoles: 0,
      statusBreakdown: {
        planned: 0,
        assigned: 0,
        inProgress: 0,
        installed: 0,
        verified: 0,
        rejected: 0,
        cancelled: 0,
      },
      installationProgress: {
        totalTarget: 0,
        completed: 0,
        completionPercentage: 0,
        remaining: 0,
        averageInstallationRate: 0,
      },
      dailyStats: {
        date: new Date(),
        polesInstalled: 0,
        polesVerified: 0,
        polesRejected: 0,
        newAssignments: 0,
      },
      weeklyStats: {
        weekStartDate: new Date(),
        weekEndDate: new Date(),
        totalInstalled: 0,
        dailyAverage: 0,
        topContractor: 'None',
        topProject: 'None',
      },
      monthlyStats: {
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
        totalInstalled: 0,
        totalVerified: 0,
        rejectionRate: 0,
        growthRate: 0,
      },
      contractorStats: [],
      projectStats: [],
      geographicStats: this.getEmptyGeographicStats(),
      qualityMetrics: {
        overallQualityScore: 0,
        photoCompletionRate: 0,
        locationAccuracyRate: 0,
        firstTimeApprovalRate: 0,
        averageRejectionReasons: [],
      },
      productivityMetrics: {
        averagePolesPerDay: 0,
        averagePolesPerContractor: 0,
        peakProductivityDay: { date: new Date(), count: 0 },
        productivityTrend: 'stable',
        estimatedDaysToCompletion: 0,
      },
    };
  }

  private getEmptyGeographicStats(): GeographicStats {
    return {
      centerPoint: { lat: 0, lng: 0 },
      radius: 0,
      polesByArea: [],
      heatmapData: [],
    };
  }

  /**
   * Get analytics for a specific date range
   */
  getAnalyticsForDateRange(startDate: Date, endDate: Date, filter?: PoleFilter): Observable<PoleAnalytics> {
    const dateRangeFilter: PoleFilter = {
      ...filter,
      dateRange: { startDate, endDate },
    };
    return this.getComprehensiveAnalytics(dateRangeFilter);
  }

  /**
   * Get analytics for a specific project
   */
  getProjectAnalytics(projectId: string): Observable<ProjectStats> {
    const filter: PoleFilter = { projectIds: [projectId] };
    return this.getProjectStats(filter).pipe(
      map((stats) => stats.find((s) => s.projectId === projectId) || this.getEmptyProjectStats(projectId))
    );
  }

  /**
   * Get analytics for a specific contractor
   */
  getContractorAnalytics(contractorId: string): Observable<ContractorStats> {
    const filter: PoleFilter = { contractorIds: [contractorId] };
    return this.getContractorStats(filter).pipe(
      map((stats) => stats.find((s) => s.contractorId === contractorId) || this.getEmptyContractorStats(contractorId))
    );
  }

  private getEmptyProjectStats(projectId: string): ProjectStats {
    return {
      projectId,
      projectName: 'Unknown',
      projectCode: 'N/A',
      totalPoles: 0,
      installedPoles: 0,
      progressPercentage: 0,
      averageInstallationRate: 0,
      statusBreakdown: {
        planned: 0,
        assigned: 0,
        inProgress: 0,
        installed: 0,
        verified: 0,
        rejected: 0,
        cancelled: 0,
      },
    };
  }

  private getEmptyContractorStats(contractorId: string): ContractorStats {
    return {
      contractorId,
      contractorName: 'Unknown',
      totalAssigned: 0,
      totalCompleted: 0,
      completionRate: 0,
      averageInstallationTime: 0,
      rejectionRate: 0,
      currentActiveAssignments: 0,
    };
  }

  /**
   * Export analytics data as JSON for API consumption
   */
  exportAnalyticsAsJson(analytics: PoleAnalytics): string {
    return JSON.stringify(analytics, null, 2);
  }

  /**
   * Get real-time summary for dashboards
   */
  getRealTimeSummary(): Observable<{
    activeInstallations: number;
    todayCompleted: number;
    weekProgress: number;
    criticalAlerts: string[];
  }> {
    return this.getComprehensiveAnalytics().pipe(
      map((analytics) => ({
        activeInstallations: analytics.statusBreakdown.inProgress,
        todayCompleted: analytics.dailyStats.polesInstalled,
        weekProgress: analytics.installationProgress.completionPercentage,
        criticalAlerts: this.generateCriticalAlerts(analytics),
      }))
    );
  }

  private generateCriticalAlerts(analytics: PoleAnalytics): string[] {
    const alerts: string[] = [];

    // Low productivity alert
    if (analytics.productivityMetrics.averagePolesPerDay < 5) {
      alerts.push('Low installation rate: Less than 5 poles per day average');
    }

    // High rejection rate
    if (analytics.monthlyStats.rejectionRate > 10) {
      alerts.push(`High rejection rate: ${analytics.monthlyStats.rejectionRate.toFixed(1)}% this month`);
    }

    // Poor quality score
    if (analytics.qualityMetrics.overallQualityScore < 70) {
      alerts.push(`Quality concerns: Overall score ${analytics.qualityMetrics.overallQualityScore.toFixed(0)}%`);
    }

    // Decreasing productivity
    if (analytics.productivityMetrics.productivityTrend === 'decreasing') {
      alerts.push('Productivity trending downward compared to last week');
    }

    return alerts;
  }
}
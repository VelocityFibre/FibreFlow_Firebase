import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { DailyKpisService } from './daily-kpis.service';
import { ProjectService } from '../../../core/services/project.service';
import { ContractorService } from '../../contractors/services/contractor.service';
import { DailyKPIs } from '../models/daily-kpis.model';
import { Project } from '../../../core/models/project.model';
import {
  WeeklyReportData,
  ProjectReportInfo,
  ReportPeriod,
  ExecutiveSummary,
  PerformanceMetrics,
  DailyAnalysis,
  OperationalChallenge,
  ResourceManagement,
  RiskAssessment,
  Recommendation,
  WeeklyAggregates,
  Achievement,
  InfrastructureMetrics,
  PermissionsMetrics,
  StringingMetrics,
  CustomerMetrics,
} from '../models/weekly-report.model';

@Injectable({
  providedIn: 'root'
})
export class WeeklyReportGeneratorService {
  private kpisService = inject(DailyKpisService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);

  generateWeeklyReport(projectId: string, startDate: Date, endDate: Date): Observable<WeeklyReportData> {
    console.log('WeeklyReportGeneratorService.generateWeeklyReport called', { projectId, startDate, endDate });
    
    return forkJoin({
      kpis: this.getWeeklyData(projectId, startDate, endDate),
      project: this.projectService.getProjectById(projectId).pipe(
        map(project => {
          console.log('Project data retrieved:', project);
          return project;
        }),
        catchError((error: any) => {
          console.error('Error fetching project:', error);
          return of(null as Project | null);
        })
      ),
      contractor: this.getContractorInfo(projectId)
    }).pipe(
      map(({ kpis, project, contractor }) => {
        console.log('All data retrieved, processing...', { kpisCount: kpis.length, project, contractor });
        const aggregates = this.calculateWeeklyAggregates(kpis);
        const dailyAnalyses = this.analyzeDailyPerformance(kpis);
        const challenges = this.identifyOperationalChallenges(kpis, aggregates);

        return {
          projectInfo: {
            projectName: project?.name || 'Unknown Project',
            projectId: project?.id || projectId,
            customer: project?.clientId || 'fibertime™',
            location: `${project?.location || 'Gauteng Province'}, Vereeniging Region`,
            contractorName: contractor?.companyName
          },
          reportPeriod: {
            startDate,
            endDate,
            year: startDate.getFullYear()
          },
          executiveSummary: this.generateExecutiveSummary(aggregates, dailyAnalyses, challenges, kpis),
          performanceMetrics: this.generatePerformanceMetrics(kpis, aggregates),
          dailyAnalysis: dailyAnalyses,
          operationalChallenges: challenges,
          resourceManagement: this.assessResourceManagement(kpis, aggregates),
          riskAssessment: this.assessRisks(challenges, aggregates, kpis),
          recommendations: this.generateRecommendations(challenges, aggregates, kpis)
        };
      }),
      catchError((error: any) => {
        console.error('Error in generateWeeklyReport:', error);
        throw error;
      })
    );
  }

  private getWeeklyData(projectId: string, startDate: Date, endDate: Date): Observable<DailyKPIs[]> {
    console.log('getWeeklyData called', { projectId, startDate, endDate });
    // Get all KPIs for the date range
    return this.kpisService.getKPIsForDateRange(projectId, startDate, endDate).pipe(
      map(kpis => {
        console.log('KPIs retrieved:', kpis.length, 'records');
        return kpis;
      }),
      catchError((error: any) => {
        console.error('Error fetching KPIs:', error);
        return of([]);
      })
    );
  }

  private getContractorInfo(projectId: string): Observable<any> {
    // This would need to be implemented based on your project-contractor relationship
    return of(null); // Placeholder
  }

  private calculateWeeklyAggregates(kpis: DailyKPIs[]): WeeklyAggregates {
    const aggregates: WeeklyAggregates = {
      totalPolesPlanted: 0,
      totalPermissions: 0,
      totalTrenching: 0,
      totalStringing: {
        cable24: 0,
        cable48: 0,
        cable96: 0,
        cable144: 0,
        cable288: 0
      },
      totalHomeSignUps: 0,
      totalHomeDrops: 0,
      totalHomeConnections: 0,
      totalCost: 0,
      totalSafetyIncidents: 0,
      totalQualityIssues: 0,
      averageTeamSize: 0,
      averageProductivityScore: 0,
      daysWithActivity: 0,
      daysWithNoActivity: 0
    };

    let totalTeamSize = 0;
    let totalProductivity = 0;
    let productivityDays = 0;

    kpis.forEach(kpi => {
      // Core metrics
      aggregates.totalPolesPlanted += kpi.polesPlantedToday || 0;
      aggregates.totalPermissions += kpi.permissionsToday || 0;
      aggregates.totalTrenching += kpi.trenchingToday || 0;

      // Stringing
      aggregates.totalStringing.cable24 += kpi.stringing24Today || 0;
      aggregates.totalStringing.cable48 += kpi.stringing48Today || 0;
      aggregates.totalStringing.cable96 += kpi.stringing96Today || 0;
      aggregates.totalStringing.cable144 += kpi.stringing144Today || 0;
      aggregates.totalStringing.cable288 += kpi.stringing288Today || 0;

      // Customer engagement
      aggregates.totalHomeSignUps += kpi.homeSignupsToday || 0;
      aggregates.totalHomeDrops += kpi.homeDropsToday || 0;
      aggregates.totalHomeConnections += kpi.homesConnectedToday || 0;

      // Financial
      aggregates.totalCost += kpi.totalCostToday || 0;

      // Safety & Quality
      aggregates.totalSafetyIncidents += kpi.safetyIncidents || 0;
      aggregates.totalQualityIssues += kpi.qualityIssues || 0;

      // Team metrics
      if (kpi.teamSize) {
        totalTeamSize += kpi.teamSize;
      }
      if (kpi.productivityScore) {
        totalProductivity += kpi.productivityScore;
        productivityDays++;
      }

      // Activity tracking
      const hasActivity = (kpi.polesPlantedToday || 0) > 0 || 
                         (kpi.permissionsToday || 0) > 0 ||
                         (kpi.trenchingToday || 0) > 0 ||
                         this.getTotalStringing(kpi) > 0;
      
      if (hasActivity) {
        aggregates.daysWithActivity++;
      } else {
        aggregates.daysWithNoActivity++;
      }
    });

    // Calculate averages
    if (kpis.length > 0) {
      aggregates.averageTeamSize = Math.round(totalTeamSize / kpis.length);
    }
    if (productivityDays > 0) {
      aggregates.averageProductivityScore = Math.round(totalProductivity / productivityDays);
    }

    return aggregates;
  }

  private getTotalStringing(kpi: DailyKPIs): number {
    return (kpi.stringing24Today || 0) +
           (kpi.stringing48Today || 0) +
           (kpi.stringing96Today || 0) +
           (kpi.stringing144Today || 0) +
           (kpi.stringing288Today || 0);
  }

  private analyzeDailyPerformance(kpis: DailyKPIs[]): DailyAnalysis[] {
    return kpis.map(kpi => {
      const totalStringing = this.getTotalStringing(kpi);
      const polesPlanted = kpi.polesPlantedToday || 0;
      const permissions = kpi.permissionsToday || 0;

      // Determine performance level
      let performanceLevel: 'high' | 'medium' | 'low' = 'low';
      const performanceScore = polesPlanted * 10 + permissions * 5 + totalStringing * 0.01;
      
      if (performanceScore > 1000) {
        performanceLevel = 'high';
      } else if (performanceScore > 500) {
        performanceLevel = 'medium';
      }

      // Generate highlights
      const highlights: string[] = [];
      if (polesPlanted > 100) highlights.push(`Exceptional pole installation: ${polesPlanted} poles`);
      if (permissions > 30) highlights.push(`Strong permissions progress: ${permissions} secured`);
      if (totalStringing > 3000) highlights.push(`Significant stringing operations: ${totalStringing}m`);
      if (kpi.productivityScore && kpi.productivityScore > 80) {
        highlights.push(`High productivity score: ${kpi.productivityScore}%`);
      }

      // Identify challenges
      const challenges: string[] = [];
      if (kpi.safetyIncidents && kpi.safetyIncidents > 0) {
        challenges.push(`Safety incidents reported: ${kpi.safetyIncidents}`);
      }
      if (kpi.weatherImpact && kpi.weatherImpact > 5) {
        challenges.push(`Weather impact on operations: ${kpi.weatherImpact}/10`);
      }
      if (polesPlanted === 0 && permissions === 0 && totalStringing === 0) {
        challenges.push('No construction activity recorded');
      }

      return {
        date: new Date(kpi.date),
        performanceLevel,
        highlights,
        challenges,
        metrics: {
          polesPlanted,
          permissions,
          totalStringing,
          weatherImpact: kpi.weatherImpact,
          teamSize: kpi.teamSize
        }
      };
    });
  }

  private identifyOperationalChallenges(kpis: DailyKPIs[], aggregates: WeeklyAggregates): OperationalChallenge[] {
    const challenges: OperationalChallenge[] = [];

    // Construction gaps
    if (aggregates.daysWithNoActivity >= 2) {
      challenges.push({
        type: 'construction_gap',
        description: `${aggregates.daysWithNoActivity} days with zero construction activity`,
        impact: aggregates.daysWithNoActivity >= 4 ? 'high' : 'medium',
        daysAffected: aggregates.daysWithNoActivity
      });
    }

    // Connection delivery
    if (aggregates.totalHomeConnections === 0 && aggregates.totalHomeDrops > 0) {
      challenges.push({
        type: 'connection_delivery',
        description: 'No home connections despite completed drops',
        impact: 'high',
        daysAffected: kpis.length
      });
    }

    // Status reporting
    const missingStatusDays = kpis.filter(k => (k.missingStatusToday || 0) > 10).length;
    if (missingStatusDays > 0) {
      challenges.push({
        type: 'status_reporting',
        description: `High missing status counts on ${missingStatusDays} days`,
        impact: 'medium',
        daysAffected: missingStatusDays
      });
    }

    // Weather impact
    const severeWeatherDays = kpis.filter(k => (k.weatherImpact || 0) > 7).length;
    if (severeWeatherDays > 0) {
      challenges.push({
        type: 'weather',
        description: `Severe weather impact on ${severeWeatherDays} days`,
        impact: 'high',
        daysAffected: severeWeatherDays
      });
    }

    return challenges;
  }

  private generateExecutiveSummary(
    aggregates: WeeklyAggregates, 
    dailyAnalyses: DailyAnalysis[],
    challenges: OperationalChallenge[],
    kpis: DailyKPIs[]
  ): ExecutiveSummary {
    // Find best performing day
    const bestDay = dailyAnalyses.reduce((best, current) => {
      const bestScore = best.metrics.polesPlanted * 10 + best.metrics.permissions * 5;
      const currentScore = current.metrics.polesPlanted * 10 + current.metrics.permissions * 5;
      return currentScore > bestScore ? current : best;
    });

    // Generate overview
    const overview = `The project demonstrated ${
      aggregates.daysWithActivity > 4 ? 'strong' : 'moderate'
    } momentum during the reporting period with ${aggregates.totalPolesPlanted} poles planted and ${
      Object.values(aggregates.totalStringing).reduce((a, b) => a + b, 0)
    } meters of cable strung across various types. ${
      aggregates.totalPermissions > 50 ? 'Strong' : 'Steady'
    } progress was achieved in permissions processing with ${
      aggregates.totalPermissions
    } permissions secured.`;

    // Key achievements
    const achievements: Achievement[] = [];
    
    if (aggregates.totalPolesPlanted > 0) {
      achievements.push({
        metric: 'Infrastructure Development',
        value: `${aggregates.totalPolesPlanted} poles`,
        context: `Peak day: ${bestDay.date.toLocaleDateString()} with ${bestDay.metrics.polesPlanted} poles`
      });
    }

    if (aggregates.totalPermissions > 0) {
      achievements.push({
        metric: 'Permissions Secured',
        value: aggregates.totalPermissions,
        context: 'Enabling continued infrastructure deployment'
      });
    }

    const totalStringing = Object.values(aggregates.totalStringing).reduce((a, b) => a + b, 0);
    if (totalStringing > 0) {
      achievements.push({
        metric: 'Cable Stringing',
        value: `${totalStringing}m`,
        context: 'Across multiple cable configurations'
      });
    }

    // Critical focus areas
    const criticalFocusAreas: string[] = [];
    
    if (aggregates.totalHomeConnections === 0) {
      criticalFocusAreas.push('Home connections remain at zero throughout the period');
    }
    
    if (challenges.some(c => c.type === 'status_reporting')) {
      criticalFocusAreas.push('High missing status counts indicate reporting system improvements needed');
    }

    if (aggregates.daysWithNoActivity >= 2) {
      criticalFocusAreas.push('Construction consistency needs improvement');
    }

    // Get site status from latest KPI
    const latestKpi = kpis[kpis.length - 1];
    if (latestKpi?.siteLiveStatus === 'Not Live') {
      criticalFocusAreas.push('Site remains offline - activation required');
    }

    return {
      overview,
      keyAchievements: achievements,
      criticalFocusAreas
    };
  }

  private generatePerformanceMetrics(kpis: DailyKPIs[], aggregates: WeeklyAggregates): PerformanceMetrics {
    // Infrastructure metrics
    const infrastructureMetrics: InfrastructureMetrics = {
      totalPolesPlanted: aggregates.totalPolesPlanted,
      dailyBreakdown: kpis.map(k => ({
        date: new Date(k.date),
        value: k.polesPlantedToday || 0
      })),
      averagePerDay: Math.round(aggregates.totalPolesPlanted / kpis.length),
      peakDay: kpis.reduce((peak, current) => {
        const currentPoles = current.polesPlantedToday || 0;
        return currentPoles > peak.count ? 
          { date: new Date(current.date), count: currentPoles } : peak;
      }, { date: new Date(), count: 0 })
    };

    // Permissions metrics
    const permissionsMetrics: PermissionsMetrics = {
      totalPermissionsSecured: aggregates.totalPermissions,
      dailyBreakdown: kpis.map(k => ({
        date: new Date(k.date),
        value: k.permissionsToday || 0
      })),
      bestPerformingDays: kpis
        .filter(k => (k.permissionsToday || 0) > 20)
        .map(k => ({ date: new Date(k.date), count: k.permissionsToday || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    };

    // Stringing metrics
    const stringingMetrics: StringingMetrics = {
      totalByType: {
        cable24Core: aggregates.totalStringing.cable24,
        cable48Core: aggregates.totalStringing.cable48,
        cable96Core: aggregates.totalStringing.cable96,
        cable144Core: aggregates.totalStringing.cable144,
        cable288Core: aggregates.totalStringing.cable288
      },
      totalOperations: Object.values(aggregates.totalStringing).reduce((a, b) => a + b, 0)
    };

    // Customer metrics
    const latestKpi = kpis[kpis.length - 1];
    const customerMetrics: CustomerMetrics = {
      homeSignUps: aggregates.totalHomeSignUps,
      homeDropsCompleted: aggregates.totalHomeDrops,
      homeConnections: aggregates.totalHomeConnections,
      siteLiveStatus: latestKpi?.siteLiveStatus || 'Not Live'
    };

    return {
      infrastructureDevelopment: infrastructureMetrics,
      permissionsProcessing: permissionsMetrics,
      stringingOperations: stringingMetrics,
      customerEngagement: customerMetrics
    };
  }

  private assessResourceManagement(kpis: DailyKPIs[], aggregates: WeeklyAggregates): ResourceManagement {
    const hasHighProductivity = aggregates.averageProductivityScore > 70;
    const hasConsistentTeams = aggregates.averageTeamSize > 10;
    const hasQualityIssues = aggregates.totalQualityIssues > 5;

    const criticalGaps: string[] = [];
    
    if (aggregates.totalHomeConnections === 0) {
      criticalGaps.push('Last mile delivery - No customer connections activated');
    }
    
    if (aggregates.daysWithNoActivity >= 3) {
      criticalGaps.push('Operational consistency - Multiple days without activity');
    }

    const hasMissingStatus = kpis.some(k => (k.missingStatusToday || 0) > 50);
    if (hasMissingStatus) {
      criticalGaps.push('Visibility systems - High missing status counts');
    }

    return {
      constructionExcellence: {
        peakCapacityDemonstrated: aggregates.totalPolesPlanted > 500,
        technicalIntegration: Object.values(aggregates.totalStringing).some(v => v > 1000),
        qualityMaintenance: !hasQualityIssues
      },
      administrativeCapabilities: {
        regulatoryCompliance: aggregates.totalPermissions > 50,
        marketValidation: aggregates.totalHomeSignUps > 100,
        infrastructurePreparation: aggregates.totalHomeDrops > 50
      },
      criticalGaps
    };
  }

  private assessRisks(
    challenges: OperationalChallenge[], 
    aggregates: WeeklyAggregates,
    kpis: DailyKPIs[]
  ): RiskAssessment {
    const immediateRisks: import('../models/weekly-report.model').Risk[] = [];
    const mediumTermRisks: import('../models/weekly-report.model').Risk[] = [];

    // Immediate risks
    if (aggregates.totalHomeConnections === 0 && aggregates.totalHomeDrops > 0) {
      immediateRisks.push({
        category: 'Service Delivery',
        description: 'Infrastructure ready but no customers connected',
        severity: 'high',
        mitigation: 'Deploy connection teams immediately'
      });
    }

    if (challenges.some(c => c.type === 'construction_gap' && c.impact === 'high')) {
      immediateRisks.push({
        category: 'Operational',
        description: 'Extended construction gaps impacting momentum',
        severity: 'high',
        mitigation: 'Implement daily construction scheduling'
      });
    }

    // Medium-term risks
    if (aggregates.averageProductivityScore < 50) {
      mediumTermRisks.push({
        category: 'Performance',
        description: 'Low productivity scores indicate efficiency issues',
        severity: 'medium',
        mitigation: 'Review resource allocation and processes'
      });
    }

    const latestKpi = kpis[kpis.length - 1];
    if (latestKpi?.siteLiveStatus === 'Not Live') {
      mediumTermRisks.push({
        category: 'Technical',
        description: 'Site not yet activated for service',
        severity: 'medium',
        mitigation: 'Accelerate technical commissioning'
      });
    }

    const overallRiskLevel = immediateRisks.length > 2 ? 'high' : 
                           (immediateRisks.length > 0 || mediumTermRisks.length > 2) ? 'medium' : 'low';

    return {
      immediateRisks,
      mediumTermRisks,
      overallRiskLevel
    };
  }

  private generateRecommendations(
    challenges: OperationalChallenge[],
    aggregates: WeeklyAggregates,
    kpis: DailyKPIs[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Immediate actions
    if (aggregates.totalHomeConnections === 0) {
      recommendations.push({
        priority: 'immediate',
        category: 'operational',
        title: 'Connection Team Deployment',
        description: 'Establish dedicated resources for customer service activation using completed infrastructure',
        expectedImpact: 'Enable revenue generation from completed infrastructure'
      });
    }

    if (challenges.some(c => c.type === 'status_reporting')) {
      recommendations.push({
        priority: 'immediate',
        category: 'process',
        title: 'Status System Enhancement',
        description: 'Implement comprehensive reporting protocols to eliminate tracking gaps',
        expectedImpact: 'Improved visibility and management oversight'
      });
    }

    // Medium-term improvements
    if (aggregates.daysWithNoActivity >= 2) {
      recommendations.push({
        priority: 'medium-term',
        category: 'resource',
        title: 'Resource Optimization',
        description: 'Balance team allocation across construction, technical, and connection activities',
        expectedImpact: 'Consistent daily operations and improved productivity'
      });
    }

    if (aggregates.averageProductivityScore < 70) {
      recommendations.push({
        priority: 'medium-term',
        category: 'operational',
        title: 'Performance Standardization',
        description: 'Establish sustainable daily targets based on demonstrated peak capacity',
        expectedImpact: 'Predictable output and resource planning'
      });
    }

    return recommendations;
  }
}
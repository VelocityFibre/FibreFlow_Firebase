import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, of, catchError, forkJoin } from 'rxjs';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  CollectionReference,
  Timestamp,
  limit,
} from '@angular/fire/firestore';

import { DailyReport, WeeklyReport, MonthlyReport, ReportConfig } from '../models/report.model';
import { DailyKPIs } from '../../daily-progress/models/daily-kpis.model';
import { ProjectFinancials } from '../../daily-progress/models/financial-tracking.model';
import { QualityMetrics } from '../../daily-progress/models/quality-metrics.model';
import { DailyKpisService } from '../../daily-progress/services/daily-kpis.service';
import { ProjectService } from '../../../core/services/project.service';
import { ContractorService } from '../../contractors/services/contractor.service';
import { StaffService } from '../../staff/services/staff.service';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private firestore = inject(Firestore);
  private kpisService = inject(DailyKpisService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private staffService = inject(StaffService);
  private authService = inject(AuthService);

  /**
   * Generate a daily report for a specific project and date
   */
  async generateDailyReport(projectId: string, date: Date): Promise<DailyReport> {
    try {
      // Get project details
      const project = await this.projectService.getProjectById(projectId).toPromise();
      if (!project) throw new Error('Project not found');

      // Get current user
      const currentUser = await this.authService.getCurrentUser();

      // Get KPIs for the specific date
      const kpis = await this.getKPIsForDate(projectId, date);
      if (!kpis) throw new Error('No KPI data found for this date');

      // Get financial data if available
      const financials = await this.getFinancialsForDate(projectId, date);

      // Get quality metrics if available
      const quality = await this.getQualityMetricsForDate(projectId, date);

      // Get contractor performance
      const contractorPerformance = await this.getContractorPerformanceForDate(projectId, date);

      // Calculate team performance
      const teamPerformance = this.calculateTeamPerformance(kpis, contractorPerformance);

      // Prepare report
      const report: DailyReport = {
        projectId,
        projectName: project.name,
        reportType: 'daily',
        period: {
          start: date,
          end: date,
        },
        generatedAt: new Date(),
        generatedBy: currentUser?.uid || 'system',
        status: 'draft',
        version: 1,

        summary: {
          date,
          weatherConditions: kpis.weatherConditions || 'Not recorded',
          overallProgress: this.calculateDailyProgress(kpis),
          keyAchievements: this.extractKeyAchievements(kpis),
          criticalIssues: this.extractCriticalIssues(kpis),
          tomorrowPlan: [], // To be filled manually or from comments
        },

        kpis,
        financials,
        quality,
        teamPerformance,

        resources: {
          equipment: this.extractEquipmentUsage(kpis),
          materials: this.extractMaterialUsage(kpis),
        },

        safety: {
          incidents: kpis.safetyIncidents || 0,
          nearMisses: kpis.nearMisses || 0,
          toolboxTalks: kpis.toolboxTalks || 0,
          observations: kpis.safetyObservations || 0,
          complianceScore: kpis.complianceScore || 100,
        },

        attachments: [],
      };

      // Save report to Firestore
      await this.saveReport(report);

      return report;
    } catch (error) {
      console.error('Error generating daily report:', error);
      throw error;
    }
  }

  /**
   * Generate a weekly report for a specific project and week
   */
  async generateWeeklyReport(projectId: string, weekStart: Date): Promise<WeeklyReport> {
    console.log('ReportService: generateWeeklyReport called', { projectId, weekStart });
    try {
      // Calculate week end date
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      console.log('Week period:', { weekStart, weekEnd });

      // Get project details
      console.log('Fetching project details...');
      const project = await this.projectService.getProjectById(projectId).toPromise();
      if (!project) {
        console.error('Project not found for ID:', projectId);
        throw new Error('Project not found');
      }
      console.log('Project found:', project.name || 'Unnamed project');

      // Get current user
      const currentUser = await this.authService.getCurrentUser();

      // Get all KPIs for the week
      console.log('Fetching KPIs for date range...');
      const weeklyKpis = await this.getKPIsForDateRange(projectId, weekStart, weekEnd);
      console.log('KPIs found:', weeklyKpis.length);

      // Aggregate weekly data
      const weeklyTotals = this.aggregateWeeklyKPIs(weeklyKpis);
      const trends = this.calculateWeeklyTrends(weeklyKpis);

      // Get financial summary
      const financialSummary = await this.getFinancialSummaryForWeek(projectId, weekStart, weekEnd);

      // Get quality summary
      const qualitySummary = await this.getQualitySummaryForWeek(projectId, weekStart, weekEnd);

      // Calculate progress analysis
      const progressAnalysis = await this.calculateProgressAnalysis(projectId, weeklyKpis);

      // Get contractor performance
      const contractorPerformance = await this.getContractorPerformanceForWeek(
        projectId,
        weekStart,
        weekEnd,
      );

      // Extract risks
      const risks = this.extractWeeklyRisks(weeklyKpis);

      // Prepare report
      const report: WeeklyReport = {
        projectId,
        projectName: project.name || 'Unnamed Project',
        reportType: 'weekly',
        period: {
          start: weekStart,
          end: weekEnd,
        },
        generatedAt: new Date(),
        generatedBy: currentUser?.uid || 'system',
        status: 'draft',
        version: 1,

        summary: {
          weekNumber: this.getWeekNumber(weekStart),
          overallProgress: this.calculateWeeklyProgress(weeklyKpis),
          weeklyHighlights: this.extractWeeklyHighlights(weeklyKpis),
          majorChallenges: this.extractWeeklyChallenges(weeklyKpis),
          nextWeekPriorities: [],
          executiveNotes: '',
        },

        kpiSummary: {
          dailyKpis: weeklyKpis,
          weeklyTotals,
          trends,
        },

        financialSummary,
        qualitySummary,
        progressAnalysis,
        contractorPerformance,
        risks,

        lessonsLearned: [], // To be filled manually
      };

      // Save report to Firestore
      console.log('Saving report to Firestore...');
      await this.saveReport(report);
      console.log('Report saved successfully');

      console.log('Final report object:', report);
      return report;
    } catch (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }
  }

  /**
   * Generate a monthly report
   */
  async generateMonthlyReport(
    projectId: string,
    month: number,
    year: number,
  ): Promise<MonthlyReport> {
    try {
      // Calculate month start and end dates
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      // Get project details
      const project = await this.projectService.getProjectById(projectId).toPromise();
      if (!project) throw new Error('Project not found');

      // Get current user
      const currentUser = await this.authService.getCurrentUser();

      // Get all KPIs for the month
      const monthlyKpis = await this.getKPIsForDateRange(projectId, monthStart, monthEnd);

      // Aggregate monthly data
      const monthlyTotals = this.aggregateMonthlyKPIs(monthlyKpis);

      // Get financial summary
      const financialSummary = await this.getFinancialSummaryForMonth(projectId, month, year);

      // Get quality summary
      const qualitySummary = await this.getQualitySummaryForMonth(projectId, month, year);

      // Calculate resource analysis
      const resourceAnalysis = await this.calculateResourceAnalysis(projectId, monthlyKpis);

      // Calculate forecast
      const forecast = await this.calculateMonthlyForecast(project, monthlyKpis);

      // Prepare report
      const report: MonthlyReport = {
        projectId,
        projectName: project.name,
        reportType: 'monthly',
        period: {
          start: monthStart,
          end: monthEnd,
        },
        generatedAt: new Date(),
        generatedBy: currentUser?.uid || 'system',
        status: 'draft',
        version: 1,

        dashboard: {
          month: `${this.getMonthName(month)} ${year}`,
          overallHealth: this.assessProjectHealth(monthlyKpis, project),
          completionPercentage: this.calculateCompletionPercentage(project),
          budgetUtilization: financialSummary?.metrics?.roi || 0,
          scheduleAdherence: this.calculateScheduleAdherence(project),
          qualityScore: qualitySummary?.overview?.qualityScore || 0,
          safetyScore: this.calculateMonthlySafetyScore(monthlyKpis),
        },

        strategicSummary: {
          executiveSummary: '',
          majorMilestones: this.extractMonthlyMilestones(project, monthlyKpis),
          strategicIssues: this.extractStrategicIssues(monthlyKpis),
          recommendations: [],
        },

        metrics: {
          kpis: {
            monthly: monthlyTotals,
            weeklyBreakdown: this.getWeeklyBreakdown(monthlyKpis),
            dailyTrend: this.getDailyProductivityTrend(monthlyKpis),
          },
          financial: financialSummary!,
          quality: qualitySummary!,
        },

        resourceAnalysis,

        stakeholderUpdate: {
          customerSatisfaction: qualitySummary?.overview?.customerSatisfaction || 0,
          communityEngagement: {
            meetings: 0,
            complaints: this.countCustomerComplaints(monthlyKpis),
            resolved: 0,
          },
          regulatoryCompliance: {
            permits: { required: 0, obtained: 0, pending: 0 },
            inspections: {
              passed: qualitySummary?.overview?.totalInspections || 0,
              failed: 0,
              scheduled: 0,
            },
          },
        },

        forecast,
        improvementPlan: [],
        appendices: {},
      };

      // Save report to Firestore
      await this.saveReport(report);

      return report;
    } catch (error) {
      console.error('Error generating monthly report:', error);
      throw error;
    }
  }

  // Helper methods
  private async getKPIsForDate(projectId: string, date: Date): Promise<DailyKPIs | null> {
    const kpis = await this.kpisService.getKPIsByProjectAndDate(projectId, date).toPromise();
    return kpis && kpis.length > 0 ? kpis[0] : null;
  }

  private async getKPIsForDateRange(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyKPIs[]> {
    console.log('getKPIsForDateRange called', { projectId, startDate, endDate });
    const kpis =
      (await this.kpisService
        .getKPIsByProjectAndDateRange(projectId, startDate, endDate)
        .toPromise()) || [];
    console.log('getKPIsForDateRange result:', kpis);
    return kpis;
  }

  private async getFinancialsForDate(
    projectId: string,
    date: Date,
  ): Promise<ProjectFinancials | undefined> {
    // TODO: Implement when financial service is created
    return undefined;
  }

  private async getQualityMetricsForDate(
    projectId: string,
    date: Date,
  ): Promise<QualityMetrics | undefined> {
    // TODO: Implement when quality service is created
    return undefined;
  }

  private async getContractorPerformanceForDate(projectId: string, date: Date): Promise<any[]> {
    // TODO: Implement contractor performance calculation
    return [];
  }

  private calculateTeamPerformance(kpis: DailyKPIs, contractorPerformance: any[]): any {
    return {
      totalTeamSize: kpis.teamSize || 0,
      totalHoursWorked: kpis.regularHours || 0,
      overtimeHours: kpis.overtimeHours || 0,
      productivityScore: kpis.productivityScore || 0,
      contractors: contractorPerformance,
    };
  }

  private calculateDailyProgress(kpis: DailyKPIs): number {
    // Simple calculation based on productivity score
    return kpis.productivityScore || 0;
  }

  private extractKeyAchievements(kpis: DailyKPIs): string[] {
    const achievements = [];

    if (kpis.polesPlantedToday > 0) {
      achievements.push(`Planted ${kpis.polesPlantedToday} poles`);
    }
    if (kpis.trenchingToday > 0) {
      achievements.push(`Completed ${kpis.trenchingToday}m of trenching`);
    }
    if (kpis.homesConnectedToday > 0) {
      achievements.push(`Connected ${kpis.homesConnectedToday} homes`);
    }

    // Add cable stringing achievements
    const stringingTypes = [
      { field: 'stringing24Today', label: '24F' },
      { field: 'stringing48Today', label: '48F' },
      { field: 'stringing96Today', label: '96F' },
      { field: 'stringing144Today', label: '144F' },
      { field: 'stringing288Today', label: '288F' },
    ];

    stringingTypes.forEach((type) => {
      const value = kpis[type.field as keyof DailyKPIs] as number;
      if (value > 0) {
        achievements.push(`Strung ${value}m of ${type.label} cable`);
      }
    });

    return achievements;
  }

  private extractCriticalIssues(kpis: DailyKPIs): string[] {
    const issues = [];

    if (kpis.safetyIncidents && kpis.safetyIncidents > 0) {
      issues.push(`${kpis.safetyIncidents} safety incident(s) reported`);
    }
    if (kpis.qualityIssues && kpis.qualityIssues > 0) {
      issues.push(`${kpis.qualityIssues} quality issue(s) identified`);
    }
    if (kpis.riskFlag) {
      issues.push('Risk flag raised');
    }
    if (kpis.weatherImpact && kpis.weatherImpact >= 7) {
      issues.push('Severe weather impact on operations');
    }

    if (kpis.keyIssuesSummary) {
      issues.push(kpis.keyIssuesSummary);
    }

    return issues;
  }

  private extractEquipmentUsage(kpis: DailyKPIs): any[] {
    return [
      {
        name: 'Vehicles',
        hoursUsed: kpis.regularHours || 0,
        utilization: kpis.equipmentUtilization || 0,
      },
    ];
  }

  private extractMaterialUsage(kpis: DailyKPIs): any[] {
    const materials: any[] = [];

    if (kpis.materialsUsed && Array.isArray(kpis.materialsUsed)) {
      return kpis.materialsUsed.map((m) => ({
        type: m.type,
        consumed: m.quantity,
        unit: m.unit,
        remaining: 0, // Would need inventory tracking
      }));
    }

    return materials;
  }

  private aggregateWeeklyKPIs(kpis: DailyKPIs[]): Partial<DailyKPIs> {
    // Initialize with all KPI fields set to 0
    const totals: any = {
      // Permissions
      permissionsToday: 0,
      missingStatusToday: 0,
      // Infrastructure
      polesPlantedToday: 0,
      trenchingToday: 0,
      // Cable Stringing
      stringing24Today: 0,
      stringing48Today: 0,
      stringing96Today: 0,
      stringing144Today: 0,
      stringing288Today: 0,
      // Home Operations
      homeSignupsToday: 0,
      homeDropsToday: 0,
      homesConnectedToday: 0,
    };

    // If we have data, sum up all daily values
    if (kpis && kpis.length > 0) {
      kpis.forEach((daily) => {
        Object.keys(totals).forEach((key) => {
          if (daily[key as keyof DailyKPIs] && typeof daily[key as keyof DailyKPIs] === 'number') {
            totals[key] = (totals[key] || 0) + (daily[key as keyof DailyKPIs] as number);
          }
        });
      });
    }

    return totals;
  }

  private calculateWeeklyTrends(kpis: DailyKPIs[]): any[] {
    // TODO: Implement trend calculation
    return [];
  }

  private async getFinancialSummaryForWeek(
    projectId: string,
    start: Date,
    end: Date,
  ): Promise<any> {
    // TODO: Implement when financial service is ready
    return {};
  }

  private async getQualitySummaryForWeek(projectId: string, start: Date, end: Date): Promise<any> {
    // TODO: Implement when quality service is ready
    return {};
  }

  private async calculateProgressAnalysis(projectId: string, kpis: DailyKPIs[]): Promise<any> {
    // TODO: Compare with project plan
    return {
      planned: { poles: 0, trenching: 0, cableStringing: 0, connections: 0 },
      actual: { poles: 0, trenching: 0, cableStringing: 0, connections: 0 },
      variance: { poles: 0, trenching: 0, cableStringing: 0, connections: 0 },
    };
  }

  private async getContractorPerformanceForWeek(
    projectId: string,
    start: Date,
    end: Date,
  ): Promise<any[]> {
    // TODO: Implement contractor performance metrics
    return [];
  }

  private extractWeeklyRisks(kpis: DailyKPIs[]): any[] {
    const risks = [];

    // Check for consistent issues
    const safetyIncidents = kpis.reduce((sum, k) => sum + (k.safetyIncidents || 0), 0);
    if (safetyIncidents > 0) {
      risks.push({
        id: 'safety-' + Date.now(),
        description: `${safetyIncidents} safety incidents this week`,
        category: 'safety',
        probability: safetyIncidents > 2 ? 'high' : 'medium',
        impact: 'high',
        mitigation: 'Review safety procedures and conduct additional training',
        status: 'ongoing',
        owner: 'Safety Officer',
      });
    }

    return risks;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private calculateWeeklyProgress(kpis: DailyKPIs[]): number {
    if (kpis.length === 0) return 0;
    const avgProductivity =
      kpis.reduce((sum, k) => sum + (k.productivityScore || 0), 0) / kpis.length;
    return Math.round(avgProductivity);
  }

  private extractWeeklyHighlights(kpis: DailyKPIs[]): string[] {
    const highlights = [];

    // Sum totals
    const totals = this.aggregateWeeklyKPIs(kpis);

    if (totals.polesPlantedToday && totals.polesPlantedToday > 0) {
      highlights.push(`${totals.polesPlantedToday} poles planted this week`);
    }

    return highlights;
  }

  private extractWeeklyChallenges(kpis: DailyKPIs[]): string[] {
    const challenges = [];

    // Count days with weather impact
    const weatherImpactDays = kpis.filter((k) => k.weatherImpact && k.weatherImpact >= 5).length;
    if (weatherImpactDays > 0) {
      challenges.push(`Weather impacted operations for ${weatherImpactDays} days`);
    }

    return challenges;
  }

  private aggregateMonthlyKPIs(kpis: DailyKPIs[]): Partial<DailyKPIs> {
    return this.aggregateWeeklyKPIs(kpis); // Same logic
  }

  private async getFinancialSummaryForMonth(
    projectId: string,
    month: number,
    year: number,
  ): Promise<any> {
    // TODO: Implement
    return {};
  }

  private async getQualitySummaryForMonth(
    projectId: string,
    month: number,
    year: number,
  ): Promise<any> {
    // TODO: Implement
    return {};
  }

  private async calculateResourceAnalysis(projectId: string, kpis: DailyKPIs[]): Promise<any> {
    const totalManDays = kpis.reduce((sum, k) => sum + (k.teamSize || 0), 0);
    const avgUtilization =
      kpis.reduce((sum, k) => sum + (k.equipmentUtilization || 0), 0) / (kpis.length || 1);

    return {
      manpower: {
        planned: 0, // Would need project plan
        actual: totalManDays,
        utilization: avgUtilization,
        forecast: Math.round((totalManDays / kpis.length) * 30), // Simple forecast
      },
      equipment: {
        availability: 100,
        utilization: avgUtilization,
        maintenanceHours: 0,
        breakdowns: 0,
      },
      materials: {
        consumption: [],
        wastage: 0,
        stockLevels: [],
      },
    };
  }

  private async calculateMonthlyForecast(project: any, kpis: DailyKPIs[]): Promise<any> {
    // Simple forecast based on current progress
    const avgDailyPoles =
      kpis.reduce((sum, k) => sum + (k.polesPlantedToday || 0), 0) / (kpis.length || 1);

    return {
      completionDate: new Date(), // Would need complex calculation
      finalCost: 0,
      remainingWork: {
        poles: 0,
        trenching: 0,
        connections: 0,
      },
      requiredResources: {
        manDays: 0,
        equipment: [],
        materials: [],
      },
      risks: [],
    };
  }

  private assessProjectHealth(
    kpis: DailyKPIs[],
    project: any,
  ): 'on-track' | 'at-risk' | 'behind-schedule' {
    // Simple assessment based on productivity
    const avgProductivity =
      kpis.reduce((sum, k) => sum + (k.productivityScore || 0), 0) / (kpis.length || 1);

    if (avgProductivity >= 80) return 'on-track';
    if (avgProductivity >= 60) return 'at-risk';
    return 'behind-schedule';
  }

  private calculateCompletionPercentage(project: any): number {
    // Would need project plan data
    return 0;
  }

  private calculateScheduleAdherence(project: any): number {
    // Would need project schedule data
    return 0;
  }

  private calculateMonthlySafetyScore(kpis: DailyKPIs[]): number {
    const totalIncidents = kpis.reduce((sum, k) => sum + (k.safetyIncidents || 0), 0);
    const avgCompliance =
      kpis.reduce((sum, k) => sum + (k.complianceScore || 100), 0) / (kpis.length || 1);

    // Simple calculation: deduct 10 points per incident from compliance average
    return Math.max(0, avgCompliance - totalIncidents * 10);
  }

  private extractMonthlyMilestones(project: any, kpis: DailyKPIs[]): any[] {
    // Would need project milestone data
    return [];
  }

  private extractStrategicIssues(kpis: DailyKPIs[]): string[] {
    const issues = [];

    // Check for recurring problems
    const totalQualityIssues = kpis.reduce((sum, k) => sum + (k.qualityIssues || 0), 0);
    if (totalQualityIssues > 10) {
      issues.push('High number of quality issues requiring attention');
    }

    return issues;
  }

  private getWeeklyBreakdown(kpis: DailyKPIs[]): Partial<DailyKPIs>[] {
    // Group by week
    const weeks: { [key: number]: DailyKPIs[] } = {};

    kpis.forEach((kpi) => {
      const week = this.getWeekNumber(new Date(kpi.date));
      if (!weeks[week]) weeks[week] = [];
      weeks[week].push(kpi);
    });

    return Object.values(weeks).map((weekKpis) => this.aggregateWeeklyKPIs(weekKpis));
  }

  private getDailyProductivityTrend(kpis: DailyKPIs[]): number[] {
    return kpis.map((k) => k.productivityScore || 0);
  }

  private countCustomerComplaints(kpis: DailyKPIs[]): number {
    return kpis.reduce((sum, k) => sum + (k.customerComplaints || 0), 0);
  }

  private getMonthName(month: number): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1];
  }

  private async saveReport(report: DailyReport | WeeklyReport | MonthlyReport): Promise<void> {
    try {
      const reportCollection = collection(this.firestore, 'reports');
      const reportDoc = doc(reportCollection);
      const reportWithId = {
        ...report,
        id: reportDoc.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await setDoc(reportDoc, reportWithId);
      // Update the report object with the ID
      (report as any).id = reportDoc.id;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  }

  /**
   * Fetch all reports from Firestore
   */
  async getReports(projectId?: string): Promise<any[]> {
    try {
      const reportCollection = collection(this.firestore, 'reports');
      let q = query(reportCollection, orderBy('createdAt', 'desc'));

      if (projectId) {
        q = query(
          reportCollection,
          where('projectId', '==', projectId),
          orderBy('createdAt', 'desc'),
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
  }

  /**
   * Get a specific report by ID
   */
  async getReportById(reportId: string): Promise<any> {
    try {
      const reportCollection = collection(this.firestore, 'reports');
      const q = query(reportCollection, where('id', '==', reportId), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching report:', error);
      return null;
    }
  }
}

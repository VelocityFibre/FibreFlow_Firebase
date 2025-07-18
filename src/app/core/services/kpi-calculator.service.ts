import { Injectable } from '@angular/core';
import { Project, PhaseType, ProjectKPITargets, KPITarget } from '../models/project.model';

@Injectable({
  providedIn: 'root',
})
export class KpiCalculatorService {
  /**
   * Calculate timeline for each KPI based on dependencies and phases
   */
  calculateKPITimelines(project: Project): ProjectKPITargets {
    if (!project.metadata?.kpiTargets) {
      throw new Error('Project has no KPI targets defined');
    }

    const kpiTargets = project.metadata.kpiTargets;
    const projectStartDate = new Date(project.startDate as any);

    // Calculate start dates based on phases and dependencies
    const calculatedTargets: ProjectKPITargets = {
      polePermissions: this.calculateKPIStartDate(
        kpiTargets.polePermissions,
        projectStartDate,
        project,
      ),
      homeSignups: this.calculateKPIStartDate(kpiTargets.homeSignups, projectStartDate, project),
      polesPlanted: this.calculateKPIStartDate(
        kpiTargets.polesPlanted,
        projectStartDate,
        project,
        kpiTargets.polePermissions,
      ),
      fibreStringing: this.calculateKPIStartDate(
        kpiTargets.fibreStringing,
        projectStartDate,
        project,
        kpiTargets.polesPlanted,
      ),
      trenchingMeters: this.calculateKPIStartDate(
        kpiTargets.trenchingMeters,
        projectStartDate,
        project,
      ),
      calculatedDuration: 0,
    };

    // Calculate overall project duration
    const endDates = [
      calculatedTargets.polePermissions.estimatedEndDate,
      calculatedTargets.homeSignups.estimatedEndDate,
      calculatedTargets.polesPlanted.estimatedEndDate,
      calculatedTargets.fibreStringing.estimatedEndDate,
      calculatedTargets.trenchingMeters.estimatedEndDate,
    ].filter((date) => date) as Date[];

    if (endDates.length > 0) {
      const latestEndDate = new Date(Math.max(...endDates.map((d) => d.getTime())));
      const durationInDays = Math.ceil(
        (latestEndDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      calculatedTargets.calculatedDuration = durationInDays;
      calculatedTargets.estimatedEndDate = latestEndDate;
    }

    return calculatedTargets;
  }

  /**
   * Calculate start date for a specific KPI based on phase and dependencies
   */
  private calculateKPIStartDate(
    kpiTarget: KPITarget,
    projectStartDate: Date,
    project: Project,
    dependsOnKPI?: KPITarget,
  ): KPITarget {
    let startDate = new Date(projectStartDate);

    // If depends on another KPI, start after dependency has some progress
    if (dependsOnKPI && dependsOnKPI.estimatedEndDate) {
      // Start when dependency is ~30% complete
      const dependencyDuration = dependsOnKPI.estimatedDays || 0;
      const dependencyStart = dependsOnKPI.estimatedStartDate || projectStartDate;
      const daysToWait = Math.ceil(dependencyDuration * 0.3);

      startDate = new Date(dependencyStart);
      startDate.setDate(startDate.getDate() + daysToWait);
    } else {
      // Calculate based on phase start
      const phaseStartDays = this.getPhaseStartDays(kpiTarget.startPhase, project);
      startDate.setDate(startDate.getDate() + phaseStartDays);
    }

    // Add any additional delay
    if (kpiTarget.startDelayDays) {
      startDate.setDate(startDate.getDate() + kpiTarget.startDelayDays);
    }

    // Calculate end date
    const estimatedDays =
      kpiTarget.estimatedDays || Math.ceil(kpiTarget.totalTarget / kpiTarget.dailyTarget);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + estimatedDays);

    return {
      ...kpiTarget,
      estimatedStartDate: startDate,
      estimatedEndDate: endDate,
      estimatedDays: estimatedDays,
    };
  }

  /**
   * Get estimated days until a phase starts
   */
  private getPhaseStartDays(phase: PhaseType, project: Project): number {
    // Rough estimates based on typical project flow
    switch (phase) {
      case PhaseType.PLANNING:
        return 0;
      case PhaseType.INITIATE_PROJECT:
        return 0; // Can start immediately
      case PhaseType.WORK_IN_PROGRESS:
        return 14; // Typically starts after 2 weeks of planning/permits
      case PhaseType.HANDOVER:
        return 60; // Rough estimate
      case PhaseType.HANDOVER_COMPLETE:
        return 75;
      case PhaseType.FINAL_ACCEPTANCE:
        return 90;
      default:
        return 0;
    }
  }

  /**
   * Calculate current progress vs targets
   */
  calculateProgress(
    currentValue: number,
    target: KPITarget,
  ): {
    percentage: number;
    isOnTrack: boolean;
    daysAhead: number;
    projectedEndDate: Date;
  } {
    if (!target.actualStartDate || target.totalTarget === 0) {
      return {
        percentage: 0,
        isOnTrack: true,
        daysAhead: 0,
        projectedEndDate: target.estimatedEndDate || new Date(),
      };
    }

    const percentage = Math.round((currentValue / target.totalTarget) * 100);

    // Calculate days elapsed
    const today = new Date();
    const daysElapsed = Math.ceil(
      (today.getTime() - new Date(target.actualStartDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate expected progress
    const expectedProgress = daysElapsed * target.dailyTarget;
    const actualProgress = currentValue;
    const progressDiff = actualProgress - expectedProgress;
    const daysAhead = Math.round(progressDiff / target.dailyTarget);

    // Calculate projected end date based on current pace
    const remainingWork = target.totalTarget - currentValue;
    const currentDailyRate = currentValue / daysElapsed;
    const remainingDays = Math.ceil(remainingWork / currentDailyRate);
    const projectedEndDate = new Date();
    projectedEndDate.setDate(projectedEndDate.getDate() + remainingDays);

    return {
      percentage,
      isOnTrack: daysAhead >= -2, // Allow 2 days behind as "on track"
      daysAhead,
      projectedEndDate,
    };
  }

  /**
   * Get visual timeline data for Gantt chart
   */
  getTimelineData(kpiTargets: ProjectKPITargets): Array<{
    name: string;
    startDate: Date;
    endDate: Date;
    progress: number;
    color: string;
  }> {
    return [
      {
        name: 'Pole Permissions',
        startDate: kpiTargets.polePermissions.estimatedStartDate!,
        endDate: kpiTargets.polePermissions.estimatedEndDate!,
        progress: kpiTargets.polePermissions.currentTotal || 0,
        color: '#3B82F6', // Blue
      },
      {
        name: 'Home Signups',
        startDate: kpiTargets.homeSignups.estimatedStartDate!,
        endDate: kpiTargets.homeSignups.estimatedEndDate!,
        progress: kpiTargets.homeSignups.currentTotal || 0,
        color: '#10B981', // Green
      },
      {
        name: 'Poles Planted',
        startDate: kpiTargets.polesPlanted.estimatedStartDate!,
        endDate: kpiTargets.polesPlanted.estimatedEndDate!,
        progress: kpiTargets.polesPlanted.currentTotal || 0,
        color: '#F59E0B', // Amber
      },
      {
        name: 'Fibre Stringing',
        startDate: kpiTargets.fibreStringing.estimatedStartDate!,
        endDate: kpiTargets.fibreStringing.estimatedEndDate!,
        progress: kpiTargets.fibreStringing.currentTotal || 0,
        color: '#8B5CF6', // Purple
      },
      {
        name: 'Trenching',
        startDate: kpiTargets.trenchingMeters.estimatedStartDate!,
        endDate: kpiTargets.trenchingMeters.estimatedEndDate!,
        progress: kpiTargets.trenchingMeters.currentTotal || 0,
        color: '#EF4444', // Red
      },
    ];
  }
}

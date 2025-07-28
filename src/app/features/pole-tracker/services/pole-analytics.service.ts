import { Injectable, inject } from '@angular/core';
import { Observable, map, of, combineLatest, switchMap } from 'rxjs';
import { PoleTrackerService } from './pole-tracker.service';
import { PoleTrackerListItem } from '../models/pole-tracker.model';
import { PlannedPole } from '../models/mobile-pole-tracker.model';

export interface PoleAnalytics {
  summary: {
    total: number;
    installed: number;
    qualityChecked: number;
    uploadsComplete: number;
    installationRate: number;
    uploadCompletionRate: number;
    qualityCheckRate: number;
  };
  byType: Record<string, number>;
  byContractor: Record<string, { name: string; count: number; performance: number }>;
  byZone: Record<string, number>;
  byMonth: Array<{ month: string; count: number; cumulative: number }>;
  uploadProgress: {
    complete: number;
    partial: number;
    none: number;
  };
  timeSeries: Array<{
    date: Date;
    installed: number;
    qualityChecked: number;
    uploadsComplete: number;
  }>;
}

export interface PivotData {
  rows: string[];
  columns: string[];
  values: number[][];
  rowTotals: number[];
  columnTotals: number[];
  grandTotal: number;
}

export interface ExportOptions {
  includeCharts: boolean;
  includePivotTables: boolean;
  includeFormulas: boolean;
  autoFilter: boolean;
  conditionalFormatting: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PoleAnalyticsService {
  private poleTrackerService = inject(PoleTrackerService);

  // Generate analytics from pole data
  generateAnalytics(poles: PoleTrackerListItem[]): PoleAnalytics {
    const total = poles.length;
    const installed = poles.filter((p) => p.dateInstalled).length;
    const qualityChecked = poles.filter((p) => p.qualityChecked).length;
    const uploadsComplete = poles.filter((p) => p.allUploadsComplete).length;

    // Group by type
    const byType: Record<string, number> = {};
    poles.forEach((pole) => {
      const type = pole.poleType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Group by contractor with performance metrics
    const byContractor: Record<string, { name: string; count: number; performance: number }> = {};
    poles.forEach((pole) => {
      if (pole.contractorName) {
        if (!byContractor[pole.contractorName]) {
          byContractor[pole.contractorName] = {
            name: pole.contractorName,
            count: 0,
            performance: 0,
          };
        }
        byContractor[pole.contractorName].count++;
      }
    });

    // Calculate contractor performance (upload completion rate)
    Object.keys(byContractor).forEach((contractor) => {
      const contractorPoles = poles.filter((p) => p.contractorName === contractor);
      const completeCount = contractorPoles.filter((p) => p.allUploadsComplete).length;
      byContractor[contractor].performance =
        contractorPoles.length > 0 ? Math.round((completeCount / contractorPoles.length) * 100) : 0;
    });

    // Group by zone
    const byZone: Record<string, number> = {};
    poles.forEach((pole) => {
      const zone = pole.zone || 'unassigned';
      byZone[zone] = (byZone[zone] || 0) + 1;
    });

    // Group by month
    const byMonth = this.generateMonthlyData(poles);

    // Upload progress breakdown
    const uploadProgress = {
      complete: poles.filter((p) => p.uploadProgress === 100).length,
      partial: poles.filter((p) => p.uploadProgress > 0 && p.uploadProgress < 100).length,
      none: poles.filter((p) => p.uploadProgress === 0).length,
    };

    // Generate time series data
    const timeSeries = this.generateTimeSeries(poles);

    return {
      summary: {
        total,
        installed,
        qualityChecked,
        uploadsComplete,
        installationRate: total > 0 ? Math.round((installed / total) * 100) : 0,
        uploadCompletionRate: total > 0 ? Math.round((uploadsComplete / total) * 100) : 0,
        qualityCheckRate: total > 0 ? Math.round((qualityChecked / total) * 100) : 0,
      },
      byType,
      byContractor,
      byZone,
      byMonth,
      uploadProgress,
      timeSeries,
    };
  }

  // Generate monthly breakdown
  private generateMonthlyData(
    poles: PoleTrackerListItem[],
  ): Array<{ month: string; count: number; cumulative: number }> {
    const monthlyData = new Map<string, number>();

    poles.forEach((pole) => {
      if (pole.dateInstalled) {
        const date =
          pole.dateInstalled instanceof Date ? pole.dateInstalled : pole.dateInstalled.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
      }
    });

    // Sort by month and calculate cumulative
    const sorted = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count], index, array) => {
        const cumulative = array.slice(0, index + 1).reduce((sum, [_, c]) => sum + c, 0);
        return { month, count, cumulative };
      });

    return sorted;
  }

  // Generate time series data for charts
  private generateTimeSeries(poles: PoleTrackerListItem[]): Array<any> {
    const dailyData = new Map<
      string,
      { installed: number; qualityChecked: number; uploadsComplete: number }
    >();

    poles.forEach((pole) => {
      if (pole.dateInstalled) {
        const date =
          pole.dateInstalled instanceof Date ? pole.dateInstalled : pole.dateInstalled.toDate();
        const dateKey = date.toISOString().split('T')[0];

        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { installed: 0, qualityChecked: 0, uploadsComplete: 0 });
        }

        const dayStats = dailyData.get(dateKey)!;
        dayStats.installed++;
        if (pole.qualityChecked) dayStats.qualityChecked++;
        if (pole.allUploadsComplete) dayStats.uploadsComplete++;
      }
    });

    return Array.from(dailyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, stats]) => ({
        date: new Date(dateStr),
        ...stats,
      }));
  }

  // Generate pivot table data
  generatePivotTable(
    poles: PoleTrackerListItem[],
    rowField: string,
    columnField: string,
    valueField: string,
  ): PivotData {
    // Group data by row and column fields
    const pivotMap = new Map<string, Map<string, number>>();

    poles.forEach((pole) => {
      const rowValue = this.getFieldValue(pole, rowField);
      const columnValue = this.getFieldValue(pole, columnField);
      const value = this.getNumericValue(pole, valueField);

      if (!pivotMap.has(rowValue)) {
        pivotMap.set(rowValue, new Map());
      }

      const rowMap = pivotMap.get(rowValue)!;
      rowMap.set(columnValue, (rowMap.get(columnValue) || 0) + value);
    });

    // Convert to arrays
    const rows = Array.from(pivotMap.keys()).sort();
    const columns = Array.from(
      new Set(Array.from(pivotMap.values()).flatMap((m) => Array.from(m.keys()))),
    ).sort();

    const values: number[][] = [];
    const rowTotals: number[] = [];

    rows.forEach((row) => {
      const rowData: number[] = [];
      let rowTotal = 0;

      columns.forEach((col) => {
        const value = pivotMap.get(row)?.get(col) || 0;
        rowData.push(value);
        rowTotal += value;
      });

      values.push(rowData);
      rowTotals.push(rowTotal);
    });

    // Calculate column totals
    const columnTotals: number[] = [];
    let grandTotal = 0;

    columns.forEach((_, colIndex) => {
      const colTotal = values.reduce((sum, row) => sum + row[colIndex], 0);
      columnTotals.push(colTotal);
      grandTotal += colTotal;
    });

    return {
      rows,
      columns,
      values,
      rowTotals,
      columnTotals,
      grandTotal,
    };
  }

  // Helper to get field value from pole object
  private getFieldValue(pole: any, field: string): string {
    switch (field) {
      case 'uploadStatus':
        return pole.allUploadsComplete ? 'Complete' : 'Incomplete';
      case 'qualityStatus':
        return pole.qualityChecked ? 'Checked' : 'Pending';
      case 'month':
        if (pole.dateInstalled) {
          const date =
            pole.dateInstalled instanceof Date ? pole.dateInstalled : pole.dateInstalled.toDate();
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        return 'No Date';
      default:
        return pole[field] || 'Unknown';
    }
  }

  // Helper to get numeric value for aggregation
  private getNumericValue(pole: any, field: string): number {
    switch (field) {
      case 'count':
        return 1;
      case 'uploadProgress':
        return pole.uploadProgress || 0;
      default:
        return pole[field] || 0;
    }
  }

  // Prepare data for Chart.js
  prepareChartData(analytics: PoleAnalytics) {
    return {
      installationProgress: {
        labels: ['Installed', 'Not Installed'],
        datasets: [
          {
            data: [
              analytics.summary.installed,
              analytics.summary.total - analytics.summary.installed,
            ],
            backgroundColor: ['#4caf50', '#e0e0e0'],
          },
        ],
      },
      polesByType: {
        labels: Object.keys(analytics.byType),
        datasets: [
          {
            label: 'Poles by Type',
            data: Object.values(analytics.byType),
            backgroundColor: ['#8d6e63', '#616161', '#455a64', '#5d4037', '#37474f'],
          },
        ],
      },
      contractorPerformance: {
        labels: Object.keys(analytics.byContractor),
        datasets: [
          {
            label: 'Performance %',
            data: Object.values(analytics.byContractor).map((c) => c.performance),
            backgroundColor: '#3f51b5',
          },
        ],
      },
      uploadCompletion: {
        labels: ['Complete', 'Partial', 'None'],
        datasets: [
          {
            data: [
              analytics.uploadProgress.complete,
              analytics.uploadProgress.partial,
              analytics.uploadProgress.none,
            ],
            backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
          },
        ],
      },
      timeSeries: {
        labels: analytics.timeSeries.map((d) => d.date.toLocaleDateString()),
        datasets: [
          {
            label: 'Installed',
            data: analytics.timeSeries.map((d) => d.installed),
            borderColor: '#4caf50',
            fill: false,
          },
          {
            label: 'Quality Checked',
            data: analytics.timeSeries.map((d) => d.qualityChecked),
            borderColor: '#2196f3',
            fill: false,
          },
          {
            label: 'Uploads Complete',
            data: analytics.timeSeries.map((d) => d.uploadsComplete),
            borderColor: '#ff9800',
            fill: false,
          },
        ],
      },
    };
  }
}

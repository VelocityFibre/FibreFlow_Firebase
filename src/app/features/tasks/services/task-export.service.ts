import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Task, TaskStatus, TaskPriority } from '../../../core/models/task.model';
import { TaskAnalytics } from './task-analytics.service';

export interface TaskExportOptions {
  includeCharts: boolean;
  includeAnalytics: boolean;
  includeTimeTracking: boolean;
  includeProjectBreakdown: boolean;
  autoFilter: boolean;
  conditionalFormatting: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaskExportService {
  
  async exportToExcel(
    tasks: Task[], 
    analytics: TaskAnalytics,
    options: TaskExportOptions = {
      includeCharts: true,
      includeAnalytics: true,
      includeTimeTracking: true,
      includeProjectBreakdown: true,
      autoFilter: true,
      conditionalFormatting: true
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'FibreFlow Task Management';
    workbook.lastModifiedBy = 'FibreFlow System';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.properties.date1904 = true;

    // Add worksheets
    if (options.includeAnalytics) {
      this.addSummarySheet(workbook, analytics);
    }
    
    this.addTaskDataSheet(workbook, tasks, options);
    
    if (options.includeProjectBreakdown) {
      this.addProjectBreakdownSheet(workbook, analytics);
    }
    
    if (options.includeTimeTracking) {
      this.addTimeTrackingSheet(workbook, tasks, analytics);
    }
    
    this.addAnalyticsSheet(workbook, analytics);
    
    // Generate and save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `task-management-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private addSummarySheet(workbook: ExcelJS.Workbook, analytics: TaskAnalytics) {
    const sheet = workbook.addWorksheet('Executive Summary', {
      properties: { tabColor: { argb: 'FF3F51B5' } }
    });

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Task Management Executive Summary';
    titleCell.font = { name: 'Arial', size: 18, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3F51B5' }
    };
    titleCell.font.color = { argb: 'FFFFFFFF' };

    // Date
    sheet.getCell('A3').value = 'Report Generated:';
    sheet.getCell('B3').value = new Date();
    sheet.getCell('B3').numFmt = 'dd/mm/yyyy hh:mm';

    // Summary Statistics
    const summaryData = [
      ['Metric', 'Value', 'Percentage'],
      ['Total Tasks', analytics.summary.total, '100%'],
      ['Completed Tasks', analytics.summary.completed, `${analytics.summary.completionRate}%`],
      ['In Progress', analytics.summary.inProgress, `${Math.round((analytics.summary.inProgress / analytics.summary.total) * 100)}%`],
      ['Pending Tasks', analytics.summary.pending, `${Math.round((analytics.summary.pending / analytics.summary.total) * 100)}%`],
      ['Blocked Tasks', analytics.summary.blocked, `${Math.round((analytics.summary.blocked / analytics.summary.total) * 100)}%`],
      ['Overdue Tasks', analytics.summary.overdue, `${Math.round((analytics.summary.overdue / analytics.summary.total) * 100)}%`],
      ['Average Progress', `${analytics.summary.averageProgress}%`, '-']
    ];

    const summaryStartRow = 5;
    summaryData.forEach((row, index) => {
      const rowNumber = summaryStartRow + index;
      row.forEach((value, colIndex) => {
        const cell = sheet.getCell(rowNumber, colIndex + 1);
        cell.value = value;
        
        if (index === 0) {
          // Header row
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE3F2FD' }
          };
        }
        
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Priority Breakdown
    sheet.getCell('A15').value = 'Priority Breakdown';
    sheet.getCell('A15').font = { bold: true, size: 14 };
    
    const priorityData = [
      ['Priority', 'Count', 'Percentage'],
      ['Critical', analytics.byPriority[TaskPriority.CRITICAL], `${Math.round((analytics.byPriority[TaskPriority.CRITICAL] / analytics.summary.total) * 100)}%`],
      ['High', analytics.byPriority[TaskPriority.HIGH], `${Math.round((analytics.byPriority[TaskPriority.HIGH] / analytics.summary.total) * 100)}%`],
      ['Medium', analytics.byPriority[TaskPriority.MEDIUM], `${Math.round((analytics.byPriority[TaskPriority.MEDIUM] / analytics.summary.total) * 100)}%`],
      ['Low', analytics.byPriority[TaskPriority.LOW], `${Math.round((analytics.byPriority[TaskPriority.LOW] / analytics.summary.total) * 100)}%`]
    ];

    const priorityStartRow = 17;
    priorityData.forEach((row, index) => {
      const rowNumber = priorityStartRow + index;
      row.forEach((value, colIndex) => {
        const cell = sheet.getCell(rowNumber, colIndex + 1);
        cell.value = value;
        
        if (index === 0) {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFD54F' }
          };
        }
        
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  private addTaskDataSheet(workbook: ExcelJS.Workbook, tasks: Task[], options: TaskExportOptions) {
    const sheet = workbook.addWorksheet('Task Data', {
      properties: { tabColor: { argb: 'FF4CAF50' } }
    });

    // Define columns
    sheet.columns = [
      { header: 'Task Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Project', key: 'projectName', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Assignee', key: 'assignedToName', width: 20 },
      { header: 'Progress %', key: 'completionPercentage', width: 12 },
      { header: 'Est. Hours', key: 'estimatedHours', width: 12 },
      { header: 'Actual Hours', key: 'actualHours', width: 12 },
      { header: 'Hours Variance', key: 'hoursVariance', width: 12 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'Completed Date', key: 'completedDate', width: 15 },
      { header: 'Created Date', key: 'createdAt', width: 15 },
      { header: 'Flagged', key: 'isFlagged', width: 10 },
      { header: 'Phase', key: 'phaseName', width: 20 },
      { header: 'Step', key: 'stepName', width: 20 }
    ];

    // Add data
    tasks.forEach((task, index) => {
      const row = sheet.addRow({
        name: task.name,
        description: task.description || '',
        projectName: task.projectName || 'No Project',
        status: task.status,
        priority: task.priority,
        assignedToName: task.assignedToName || 'Unassigned',
        completionPercentage: task.completionPercentage || 0,
        estimatedHours: task.estimatedHours || 0,
        actualHours: task.actualHours || 0,
        hoursVariance: (task.actualHours || 0) - (task.estimatedHours || 0),
        dueDate: task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate() : task.dueDate) : null,
        startDate: task.startDate ? (task.startDate.toDate ? task.startDate.toDate() : task.startDate) : null,
        completedDate: task.completedDate ? (task.completedDate.toDate ? task.completedDate.toDate() : task.completedDate) : null,
        createdAt: task.createdAt ? (task.createdAt.toDate ? task.createdAt.toDate() : task.createdAt) : null,
        isFlagged: task.isFlagged ? 'Yes' : 'No',
        phaseName: task.phaseName || '',
        stepName: task.stepName || ''
      });

      // Apply conditional formatting
      if (options.conditionalFormatting) {
        // Status cell formatting
        const statusCell = row.getCell('status');
        const statusColors: Record<TaskStatus, string> = {
          [TaskStatus.PENDING]: 'FF9E9E9E',
          [TaskStatus.IN_PROGRESS]: 'FF2196F3',
          [TaskStatus.COMPLETED]: 'FF4CAF50',
          [TaskStatus.BLOCKED]: 'FFF44336'
        };
        
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: statusColors[task.status] || 'FF9E9E9E' }
        };
        statusCell.font = { color: { argb: 'FFFFFFFF' } };

        // Priority cell formatting
        const priorityCell = row.getCell('priority');
        const priorityColors: Record<TaskPriority, string> = {
          [TaskPriority.LOW]: 'FF4CAF50',
          [TaskPriority.MEDIUM]: 'FFFF9800',
          [TaskPriority.HIGH]: 'FFF44336',
          [TaskPriority.CRITICAL]: 'FF9C27B0'
        };
        
        priorityCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: priorityColors[task.priority] || 'FF9E9E9E' }
        };
        priorityCell.font = { color: { argb: 'FFFFFFFF' } };

        // Progress cell formatting
        const progressCell = row.getCell('completionPercentage');
        const progress = task.completionPercentage || 0;
        if (progress === 100) {
          progressCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F5E9' }
          };
        } else if (progress > 50) {
          progressCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF3E0' }
          };
        } else if (progress > 0) {
          progressCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE3F2FD' }
          };
        }

        // Overdue task highlighting
        if (task.dueDate) {
          const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : task.dueDate;
          const now = new Date();
          if (dueDate < now && task.status !== TaskStatus.COMPLETED) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEBEE' }
              };
            });
          }
        }

        // Flagged task highlighting
        if (task.isFlagged) {
          const flaggedCell = row.getCell('isFlagged');
          flaggedCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF3E0' }
          };
          flaggedCell.font = { color: { argb: 'FFFF9800' }, bold: true };
        }
      }
    });

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 35;

    // Add auto-filter
    if (options.autoFilter) {
      sheet.autoFilter = {
        from: 'A1',
        to: `Q${tasks.length + 1}`
      };
    }

    // Freeze panes
    sheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // Format date columns
    sheet.getColumn('dueDate').numFmt = 'dd/mm/yyyy';
    sheet.getColumn('startDate').numFmt = 'dd/mm/yyyy';
    sheet.getColumn('completedDate').numFmt = 'dd/mm/yyyy';
    sheet.getColumn('createdAt').numFmt = 'dd/mm/yyyy';
    sheet.getColumn('completionPercentage').numFmt = '0"%"';
  }

  private addProjectBreakdownSheet(workbook: ExcelJS.Workbook, analytics: TaskAnalytics) {
    const sheet = workbook.addWorksheet('Project Breakdown', {
      properties: { tabColor: { argb: 'FFFF9800' } }
    });

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Project Task Breakdown';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = ['Project', 'Total Tasks', 'Completed', 'In Progress', 'Completion Rate', 'Performance'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD54F' }
      };
    });

    // Data
    let rowIndex = 4;
    Object.values(analytics.byProject).forEach((project: any) => {
      const row = sheet.getRow(rowIndex);
      row.getCell(1).value = project.name;
      row.getCell(2).value = project.count;
      row.getCell(3).value = project.completed;
      row.getCell(4).value = project.count - project.completed;
      row.getCell(5).value = project.completionRate / 100;
      row.getCell(5).numFmt = '0.00%';
      
      // Performance indicator
      const performanceCell = row.getCell(6);
      if (project.completionRate >= 80) {
        performanceCell.value = 'Excellent';
        performanceCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' }
        };
      } else if (project.completionRate >= 60) {
        performanceCell.value = 'Good';
        performanceCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3E0' }
        };
      } else {
        performanceCell.value = 'Needs Attention';
        performanceCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEBEE' }
        };
      }
      
      rowIndex++;
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  private addTimeTrackingSheet(workbook: ExcelJS.Workbook, tasks: Task[], analytics: TaskAnalytics) {
    const sheet = workbook.addWorksheet('Time Tracking', {
      properties: { tabColor: { argb: 'FF2196F3' } }
    });

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Time Tracking Analysis';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Summary
    sheet.getCell('A3').value = 'Summary';
    sheet.getCell('A3').font = { bold: true, size: 14 };

    const summaryData = [
      ['Metric', 'Value'],
      ['Total Estimated Hours', analytics.timeTracking.totalEstimated],
      ['Total Actual Hours', analytics.timeTracking.totalActual],
      ['Hours Variance', analytics.timeTracking.variance],
      ['On-time Completions', analytics.timeTracking.onTimeCompletions],
      ['Overdue Completions', analytics.timeTracking.overdueCompletions]
    ];

    summaryData.forEach((row, index) => {
      const rowNumber = 5 + index;
      row.forEach((value, colIndex) => {
        const cell = sheet.getCell(rowNumber, colIndex + 1);
        cell.value = value;
        
        if (index === 0) {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE3F2FD' }
          };
        }
      });
    });

    // Task details
    sheet.getCell('A13').value = 'Task Time Details';
    sheet.getCell('A13').font = { bold: true, size: 14 };

    const taskHeaders = ['Task', 'Estimated Hours', 'Actual Hours', 'Variance', 'Status', 'Efficiency'];
    taskHeaders.forEach((header, index) => {
      const cell = sheet.getCell(15, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE3F2FD' }
      };
    });

    // Task data
    tasks.forEach((task, index) => {
      if (task.estimatedHours || task.actualHours) {
        const row = sheet.getRow(16 + index);
        const estimated = task.estimatedHours || 0;
        const actual = task.actualHours || 0;
        const variance = actual - estimated;
        const efficiency = estimated > 0 ? (estimated / actual) * 100 : 0;

        row.getCell(1).value = task.name;
        row.getCell(2).value = estimated;
        row.getCell(3).value = actual;
        row.getCell(4).value = variance;
        row.getCell(5).value = task.status;
        row.getCell(6).value = efficiency;
        row.getCell(6).numFmt = '0.00%';

        // Color code variance
        const varianceCell = row.getCell(4);
        if (variance > 0) {
          varianceCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEBEE' }
          };
        } else if (variance < 0) {
          varianceCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F5E9' }
          };
        }
      }
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 18;
    });
  }

  private addAnalyticsSheet(workbook: ExcelJS.Workbook, analytics: TaskAnalytics) {
    const sheet = workbook.addWorksheet('Analytics', {
      properties: { tabColor: { argb: 'FF9C27B0' } }
    });

    // Assignee Performance
    sheet.getCell('A1').value = 'Assignee Performance Analysis';
    sheet.getCell('A1').font = { size: 14, bold: true };

    const assigneeHeaders = ['Assignee', 'Total Tasks', 'Completed', 'Completion Rate', 'Average Progress'];
    assigneeHeaders.forEach((header, index) => {
      const cell = sheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3E5F5' }
      };
    });

    let rowIndex = 4;
    Object.values(analytics.byAssignee).forEach((assignee: any) => {
      const row = sheet.getRow(rowIndex);
      row.getCell(1).value = assignee.name;
      row.getCell(2).value = assignee.count;
      row.getCell(3).value = assignee.completed;
      row.getCell(4).value = assignee.completionRate / 100;
      row.getCell(4).numFmt = '0.00%';
      row.getCell(5).value = assignee.averageProgress / 100;
      row.getCell(5).numFmt = '0.00%';

      // Performance highlighting
      const completionCell = row.getCell(4);
      if (assignee.completionRate >= 80) {
        completionCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' }
        };
      } else if (assignee.completionRate >= 60) {
        completionCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3E0' }
        };
      } else {
        completionCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEBEE' }
        };
      }

      rowIndex++;
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  // Export for specific formats
  async exportForPowerBI(tasks: Task[]): Promise<void> {
    const powerBIData = tasks.map(task => ({
      'Task ID': task.id,
      'Task Name': task.name,
      'Description': task.description || '',
      'Project': task.projectName || 'No Project',
      'Status': task.status,
      'Priority': task.priority,
      'Assignee': task.assignedToName || 'Unassigned',
      'Progress': task.completionPercentage || 0,
      'Estimated Hours': task.estimatedHours || 0,
      'Actual Hours': task.actualHours || 0,
      'Hours Variance': (task.actualHours || 0) - (task.estimatedHours || 0),
      'Due Date': task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate().toISOString() : (task.dueDate as any as Date).toISOString()) : '',
      'Created Date': task.createdAt ? (task.createdAt.toDate ? task.createdAt.toDate().toISOString() : (task.createdAt as any as Date).toISOString()) : '',
      'Completed Date': task.completedDate ? (task.completedDate.toDate ? task.completedDate.toDate().toISOString() : (task.completedDate as any as Date).toISOString()) : '',
      'Is Flagged': task.isFlagged ? 1 : 0,
      'Phase': task.phaseName || '',
      'Step': task.stepName || ''
    }));

    // Create CSV for Power BI
    const headers = Object.keys(powerBIData[0]).join(',');
    const rows = powerBIData.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, `task-management-powerbi-${new Date().toISOString().split('T')[0]}.csv`);
  }
}
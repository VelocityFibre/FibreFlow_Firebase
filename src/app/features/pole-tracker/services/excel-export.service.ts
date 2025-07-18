import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PoleTrackerListItem } from '../models/pole-tracker.model';
import { PoleAnalytics, PivotData } from './pole-analytics.service';

export interface ExcelExportOptions {
  includeCharts: boolean;
  includePivotTables: boolean;
  includeFormulas: boolean;
  autoFilter: boolean;
  conditionalFormatting: boolean;
  includeSummary: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {
  
  async exportToExcel(
    poles: PoleTrackerListItem[], 
    analytics: PoleAnalytics,
    pivotData?: PivotData,
    options: ExcelExportOptions = {
      includeCharts: true,
      includePivotTables: true,
      includeFormulas: true,
      autoFilter: true,
      conditionalFormatting: true,
      includeSummary: true
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'FibreFlow';
    workbook.lastModifiedBy = 'FibreFlow System';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.properties.date1904 = true;

    // Add worksheets
    if (options.includeSummary) {
      this.addSummarySheet(workbook, analytics);
    }
    
    this.addDataSheet(workbook, poles, options);
    
    if (options.includePivotTables && pivotData) {
      this.addPivotSheet(workbook, pivotData);
    }
    
    this.addAnalyticsSheet(workbook, analytics);
    
    // Generate and save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `pole-tracker-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private addSummarySheet(workbook: ExcelJS.Workbook, analytics: PoleAnalytics) {
    const sheet = workbook.addWorksheet('Summary', {
      properties: { tabColor: { argb: 'FF3F51B5' } }
    });

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Pole Tracker Executive Summary';
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
      ['Total Poles', analytics.summary.total, '100%'],
      ['Installed', analytics.summary.installed, `${analytics.summary.installationRate}%`],
      ['Quality Checked', analytics.summary.qualityChecked, `${analytics.summary.qualityCheckRate}%`],
      ['Uploads Complete', analytics.summary.uploadsComplete, `${analytics.summary.uploadCompletionRate}%`]
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

    // Add mini charts (sparklines simulation)
    sheet.getCell('E5').value = 'Progress Indicators';
    sheet.getCell('E5').font = { bold: true };
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  private addDataSheet(workbook: ExcelJS.Workbook, poles: PoleTrackerListItem[], options: ExcelExportOptions) {
    const sheet = workbook.addWorksheet('Pole Data', {
      properties: { tabColor: { argb: 'FF4CAF50' } }
    });

    // Define columns
    sheet.columns = [
      { header: 'VF Pole ID', key: 'vfPoleId', width: 15 },
      { header: 'Pole Number', key: 'poleNumber', width: 15 },
      { header: 'PON', key: 'pon', width: 12 },
      { header: 'Zone', key: 'zone', width: 10 },
      { header: 'GPS Location', key: 'location', width: 25 },
      { header: 'Project', key: 'projectName', width: 20 },
      { header: 'Date Installed', key: 'dateInstalled', width: 15 },
      { header: 'Type', key: 'poleType', width: 12 },
      { header: 'Contractor', key: 'contractorName', width: 20 },
      { header: 'Upload Progress', key: 'uploadProgress', width: 15 },
      { header: 'Photos Uploaded', key: 'uploadedCount', width: 15 },
      { header: 'Quality Checked', key: 'qualityChecked', width: 15 },
      { header: 'Drop Count', key: 'dropCount', width: 12 },
      { header: 'Capacity Used', key: 'capacityUsed', width: 15 }
    ];

    // Add data with formulas
    poles.forEach((pole, index) => {
      const row = sheet.addRow({
        vfPoleId: pole.vfPoleId,
        poleNumber: pole.poleNumber,
        pon: pole.pon || '-',
        zone: pole.zone || '-',
        location: pole.location,
        projectName: pole.projectName || pole.projectCode,
        dateInstalled: pole.dateInstalled ? (pole.dateInstalled instanceof Date ? pole.dateInstalled : pole.dateInstalled.toDate()) : null,
        poleType: pole.poleType,
        contractorName: pole.contractorName || '-',
        uploadProgress: pole.uploadProgress,
        uploadedCount: pole.uploadedCount,
        qualityChecked: pole.qualityChecked ? 'Yes' : 'No',
        dropCount: pole.dropCount || 0,
        capacityUsed: options.includeFormulas 
          ? { formula: `=${sheet.getCell(index + 2, 13).address}/12*100` }
          : `${Math.round((pole.dropCount || 0) / 12 * 100)}%`
      });

      // Apply conditional formatting
      if (options.conditionalFormatting) {
        // Upload progress cell
        const uploadCell = row.getCell('uploadProgress');
        if (pole.uploadProgress === 100) {
          uploadCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F5E9' }
          };
        } else if (pole.uploadProgress > 0) {
          uploadCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF3E0' }
          };
        } else {
          uploadCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEBEE' }
          };
        }

        // Quality check cell
        const qaCell = row.getCell('qualityChecked');
        if (pole.qualityChecked) {
          qaCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
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
    headerRow.height = 30;

    // Add auto-filter
    if (options.autoFilter) {
      sheet.autoFilter = {
        from: 'A1',
        to: `N${poles.length + 1}`
      };
    }

    // Freeze panes
    sheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // Format date column
    sheet.getColumn('dateInstalled').numFmt = 'dd/mm/yyyy';
    sheet.getColumn('uploadProgress').numFmt = '0"%"';
    sheet.getColumn('capacityUsed').numFmt = '0.00"%"';
  }

  private addPivotSheet(workbook: ExcelJS.Workbook, pivotData: PivotData) {
    const sheet = workbook.addWorksheet('Pivot Analysis', {
      properties: { tabColor: { argb: 'FFFF9800' } }
    });

    // Title
    sheet.mergeCells('A1:' + String.fromCharCode(65 + pivotData.columns.length + 1) + '1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Pivot Table Analysis';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Headers
    const startRow = 3;
    const startCol = 2;

    // Column headers
    pivotData.columns.forEach((col, index) => {
      const cell = sheet.getCell(startRow, startCol + index);
      cell.value = col;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD54F' }
      };
    });

    // Add "Total" column header
    const totalColCell = sheet.getCell(startRow, startCol + pivotData.columns.length);
    totalColCell.value = 'Total';
    totalColCell.font = { bold: true };
    totalColCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFAB40' }
    };

    // Data rows
    pivotData.rows.forEach((rowLabel, rowIndex) => {
      // Row header
      const rowHeaderCell = sheet.getCell(startRow + rowIndex + 1, 1);
      rowHeaderCell.value = rowLabel;
      rowHeaderCell.font = { bold: true };
      rowHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD54F' }
      };

      // Data values
      pivotData.values[rowIndex].forEach((value, colIndex) => {
        const cell = sheet.getCell(startRow + rowIndex + 1, startCol + colIndex);
        cell.value = value;
        cell.numFmt = '#,##0';
      });

      // Row total
      const rowTotalCell = sheet.getCell(startRow + rowIndex + 1, startCol + pivotData.columns.length);
      rowTotalCell.value = pivotData.rowTotals[rowIndex];
      rowTotalCell.numFmt = '#,##0';
      rowTotalCell.font = { bold: true };
    });

    // Column totals row
    const totalRowIndex = startRow + pivotData.rows.length + 1;
    const totalRowHeaderCell = sheet.getCell(totalRowIndex, 1);
    totalRowHeaderCell.value = 'Total';
    totalRowHeaderCell.font = { bold: true };
    totalRowHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFAB40' }
    };

    // Column totals
    pivotData.columnTotals.forEach((total, index) => {
      const cell = sheet.getCell(totalRowIndex, startCol + index);
      cell.value = total;
      cell.numFmt = '#,##0';
      cell.font = { bold: true };
    });

    // Grand total
    const grandTotalCell = sheet.getCell(totalRowIndex, startCol + pivotData.columns.length);
    grandTotalCell.value = pivotData.grandTotal;
    grandTotalCell.numFmt = '#,##0';
    grandTotalCell.font = { bold: true };
    grandTotalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6F00' }
    };

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  private addAnalyticsSheet(workbook: ExcelJS.Workbook, analytics: PoleAnalytics) {
    const sheet = workbook.addWorksheet('Analytics', {
      properties: { tabColor: { argb: 'FF2196F3' } }
    });

    // By Type Analysis
    sheet.getCell('A1').value = 'Analysis by Pole Type';
    sheet.getCell('A1').font = { size: 14, bold: true };

    const typeStartRow = 3;
    sheet.getCell(typeStartRow, 1).value = 'Type';
    sheet.getCell(typeStartRow, 2).value = 'Count';
    sheet.getCell(typeStartRow, 3).value = 'Percentage';

    Object.entries(analytics.byType).forEach(([type, count], index) => {
      const row = typeStartRow + index + 1;
      sheet.getCell(row, 1).value = type;
      sheet.getCell(row, 2).value = count;
      sheet.getCell(row, 3).value = { 
        formula: `=B${row}/$B$${typeStartRow + Object.keys(analytics.byType).length + 1}` 
      };
      sheet.getCell(row, 3).numFmt = '0.00%';
    });

    // Total row
    const typeTotalRow = typeStartRow + Object.keys(analytics.byType).length + 1;
    sheet.getCell(typeTotalRow, 1).value = 'Total';
    sheet.getCell(typeTotalRow, 2).value = { 
      formula: `=SUM(B${typeStartRow + 1}:B${typeTotalRow - 1})` 
    };
    sheet.getCell(typeTotalRow, 1).font = { bold: true };
    sheet.getCell(typeTotalRow, 2).font = { bold: true };

    // Contractor Performance Analysis
    const contractorStartRow = typeTotalRow + 3;
    sheet.getCell(contractorStartRow - 1, 1).value = 'Contractor Performance Analysis';
    sheet.getCell(contractorStartRow - 1, 1).font = { size: 14, bold: true };

    sheet.getCell(contractorStartRow, 1).value = 'Contractor';
    sheet.getCell(contractorStartRow, 2).value = 'Poles';
    sheet.getCell(contractorStartRow, 3).value = 'Upload Completion %';

    Object.entries(analytics.byContractor).forEach(([contractor, data], index) => {
      const row = contractorStartRow + index + 1;
      sheet.getCell(row, 1).value = data.name;
      sheet.getCell(row, 2).value = data.count;
      sheet.getCell(row, 3).value = data.performance / 100;
      sheet.getCell(row, 3).numFmt = '0.00%';
      
      // Apply conditional formatting
      const perfCell = sheet.getCell(row, 3);
      if (data.performance >= 90) {
        perfCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' }
        };
      } else if (data.performance >= 70) {
        perfCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3E0' }
        };
      } else {
        perfCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEBEE' }
        };
      }
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  // Export for Power BI
  async exportForPowerBI(poles: PoleTrackerListItem[]): Promise<void> {
    const powerBIData = poles.map(pole => ({
      'VF Pole ID': pole.vfPoleId,
      'Pole Number': pole.poleNumber,
      'PON': pole.pon || '',
      'Zone': pole.zone || '',
      'Latitude': pole.location ? pole.location.split(',')[0]?.trim() : '',
      'Longitude': pole.location ? pole.location.split(',')[1]?.trim() : '',
      'Project': pole.projectName || pole.projectCode,
      'Date Installed': pole.dateInstalled ? (pole.dateInstalled instanceof Date ? pole.dateInstalled.toISOString() : pole.dateInstalled.toDate().toISOString()) : '',
      'Pole Type': pole.poleType || '',
      'Contractor': pole.contractorName || '',
      'Upload Progress': pole.uploadProgress,
      'Photos Uploaded': pole.uploadedCount,
      'Quality Checked': pole.qualityChecked ? 1 : 0,
      'Drop Count': pole.dropCount || 0,
      'Capacity Utilization': Math.round((pole.dropCount || 0) / 12 * 100)
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
    saveAs(blob, `pole-tracker-powerbi-${new Date().toISOString().split('T')[0]}.csv`);
  }
}
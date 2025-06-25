import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyReport, WeeklyReport, MonthlyReport } from '../models/report.model';

@Injectable({
  providedIn: 'root',
})
export class ReportPDFService {
  
  /**
   * Generate PDF for any report type
   */
  generateReportPDF(report: DailyReport | WeeklyReport | MonthlyReport): jsPDF {
    if (!report) {
      throw new Error('Report is required');
    }
    
    switch (report.reportType) {
      case 'daily':
        return this.generateDailyPDF(report as DailyReport);
      case 'weekly':
        return this.generateWeeklyPDF(report as WeeklyReport);
      case 'monthly':
        return this.generateMonthlyPDF(report as MonthlyReport);
      default:
        throw new Error(`Unknown report type: ${(report as any).reportType || 'undefined'}`);
    }
  }

  /**
   * Generate Daily Report PDF
   */
  private generateDailyPDF(report: DailyReport): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    this.addHeader(doc, 'DAILY PROGRESS REPORT', report.projectName, yPosition);
    yPosition += 30;

    // Report Date
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(report.summary.date).toLocaleDateString()}`, 20, yPosition);
    doc.text(`Weather: ${report.summary.weatherConditions}`, pageWidth / 2, yPosition);
    yPosition += 15;

    // Executive Summary
    yPosition = this.addSection(doc, 'Executive Summary', yPosition);
    
    // Key Achievements
    if (report.summary.keyAchievements.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Achievements:', 20, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      
      report.summary.keyAchievements.forEach(achievement => {
        doc.text(`• ${achievement}`, 25, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // KPI Summary Table
    yPosition = this.addSection(doc, 'Daily KPIs', yPosition);
    
    const kpiData = [
      ['Metric', 'Today', 'Total', 'Unit'],
      ['Permissions', report.kpis.permissionsToday || 0, report.kpis.permissionsTotal || 0, 'count'],
      ['Poles Planted', report.kpis.polesPlantedToday || 0, report.kpis.polesPlantedTotal || 0, 'count'],
      ['Trenching', report.kpis.trenchingToday || 0, report.kpis.trenchingTotal || 0, 'meters'],
      ['Homes Connected', report.kpis.homesConnectedToday || 0, report.kpis.homesConnectedTotal || 0, 'count'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [kpiData[0]],
      body: kpiData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Safety Summary
    if (report.safety) {
      yPosition = this.addSection(doc, 'Safety & Compliance', yPosition);
      
      const safetyData = [
        ['Metric', 'Value'],
        ['Safety Incidents', report.safety.incidents],
        ['Near Misses', report.safety.nearMisses],
        ['Toolbox Talks', report.safety.toolboxTalks],
        ['Compliance Score', `${report.safety.complianceScore}%`],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [safetyData[0]],
        body: safetyData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 100 } }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Critical Issues
    if (report.summary.criticalIssues.length > 0) {
      yPosition = this.addSection(doc, 'Critical Issues', yPosition);
      
      doc.setFontSize(10);
      report.summary.criticalIssues.forEach(issue => {
        doc.text(`• ${issue}`, 25, yPosition);
        yPosition += 5;
      });
    }

    // Footer
    this.addFooter(doc, report);

    return doc;
  }

  /**
   * Generate Weekly Report PDF
   */
  private generateWeeklyPDF(report: WeeklyReport): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    this.addHeader(doc, 'WEEKLY PROGRESS REPORT', report.projectName, yPosition);
    yPosition += 30;

    // Report Period
    const startDate = new Date(report.period.start).toLocaleDateString();
    const endDate = new Date(report.period.end).toLocaleDateString();
    doc.setFontSize(12);
    doc.text(`Week: ${startDate} - ${endDate}`, 20, yPosition);
    doc.text(`Progress: ${report.summary.overallProgress}%`, pageWidth - 60, yPosition);
    yPosition += 15;

    // Weekly Highlights
    yPosition = this.addSection(doc, 'Weekly Highlights', yPosition);
    
    doc.setFontSize(10);
    report.summary.weeklyHighlights.forEach(highlight => {
      doc.text(`• ${highlight}`, 25, yPosition);
      yPosition += 5;
    });
    yPosition += 10;

    // KPI Summary
    yPosition = this.addSection(doc, 'Weekly KPI Summary', yPosition);
    
    // Aggregate weekly totals
    const weeklyTotals = report.kpiSummary.weeklyTotals;
    const kpiData = [
      ['Metric', 'This Week', 'Cumulative Total'],
      ['Poles Planted', weeklyTotals.polesPlantedToday || 0, '-'],
      ['Trenching (m)', weeklyTotals.trenchingToday || 0, '-'],
      ['Homes Connected', weeklyTotals.homesConnectedToday || 0, '-'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [kpiData[0]],
      body: kpiData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Major Challenges
    if (report.summary.majorChallenges.length > 0) {
      yPosition = this.addSection(doc, 'Major Challenges', yPosition);
      
      doc.setFontSize(10);
      report.summary.majorChallenges.forEach(challenge => {
        doc.text(`• ${challenge}`, 25, yPosition);
        yPosition += 5;
      });
    }

    // Footer
    this.addFooter(doc, report);

    return doc;
  }

  /**
   * Generate Monthly Report PDF
   */
  private generateMonthlyPDF(report: MonthlyReport): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    this.addHeader(doc, 'MONTHLY PROGRESS REPORT', report.projectName, yPosition);
    yPosition += 30;

    // Dashboard Summary
    yPosition = this.addSection(doc, 'Executive Dashboard', yPosition);
    
    const dashboardData = [
      ['Metric', 'Value', 'Status'],
      ['Overall Health', report.dashboard.overallHealth, this.getStatusColor(report.dashboard.overallHealth)],
      ['Completion', `${report.dashboard.completionPercentage}%`, 'info'],
      ['Budget Utilization', `${report.dashboard.budgetUtilization}%`, 'info'],
      ['Quality Score', `${report.dashboard.qualityScore}%`, 'info'],
      ['Safety Score', `${report.dashboard.safetyScore}%`, 'info'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [dashboardData[0]],
      body: dashboardData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [52, 73, 94] },
      styles: { fontSize: 9 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Strategic Issues
    if (report.strategicSummary.strategicIssues.length > 0) {
      yPosition = this.addSection(doc, 'Strategic Issues', yPosition);
      
      doc.setFontSize(10);
      report.strategicSummary.strategicIssues.forEach(issue => {
        doc.text(`• ${issue}`, 25, yPosition);
        yPosition += 5;
      });
    }

    // Footer
    this.addFooter(doc, report);

    return doc;
  }

  /**
   * Helper methods
   */
  private addHeader(doc: jsPDF, title: string, projectName: string, yPosition: number): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    
    // Project name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(projectName, pageWidth / 2, yPosition + 10, { align: 'center' });
  }

  private addSection(doc: jsPDF, title: string, yPosition: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, yPosition);
    doc.setFont('helvetica', 'normal');
    return yPosition + 7;
  }

  private addFooter(doc: jsPDF, report: any): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 20, pageHeight - 10);
    doc.text(`Page 1`, pageWidth - 30, pageHeight - 10);
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'on-track': return 'success';
      case 'at-risk': return 'warning';
      case 'behind-schedule': return 'danger';
      default: return 'info';
    }
  }

  /**
   * Save PDF to file
   */
  savePDF(doc: jsPDF, filename: string): void {
    doc.save(filename);
  }

  /**
   * Get PDF as Base64 for email attachment
   */
  getPDFAsBase64(doc: jsPDF): string {
    return doc.output('datauristring').split(',')[1];
  }

  /**
   * Get PDF as Blob for upload
   */
  getPDFAsBlob(doc: jsPDF): Blob {
    return doc.output('blob');
  }
}
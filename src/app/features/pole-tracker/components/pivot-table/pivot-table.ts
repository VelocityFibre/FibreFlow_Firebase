import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-pivot-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule],
  templateUrl: './pivot-table.html',
  styleUrl: './pivot-table.scss',
})
export class PivotTableComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('pivotContainer', { static: false }) pivotContainer!: ElementRef;
  @Input() data: any[] = [];

  errorMessage = '';
  processedData: any[] = [];
  summaryData: any = {};

  ngOnInit() {
    console.log('PivotTableComponent ngOnInit - data length:', this.data?.length || 0);
  }

  ngAfterViewInit() {
    console.log('PivotTableComponent ngAfterViewInit');
    this.processData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && !changes['data'].firstChange) {
      console.log('Data changed, updating pivot table:', this.data?.length || 0, 'records');
      this.processData();
    }
  }

  ngOnDestroy() {
    // No cleanup needed
  }

  private processData() {
    try {
      // Clear any error messages
      this.errorMessage = '';

      // Transform data for simple display
      this.processedData = this.transformDataForPivot();

      if (this.processedData.length === 0) {
        console.warn('No data available for pivot table');
        this.errorMessage = 'No data available for pivot table. Please select a project first.';
        return;
      }

      console.log('Processing', this.processedData.length, 'records');

      // Create summary data
      this.summaryData = this.createSummary(this.processedData);
    } catch (error) {
      console.error('Error processing data:', error);
      this.errorMessage = `Error processing data: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private createSummary(data: any[]): any {
    const summary: any = {
      totalPoles: data.length,
      byProject: {},
      byMonth: {},
      byStatus: {},
    };

    data.forEach((item) => {
      // By Project
      if (!summary.byProject[item.Project]) {
        summary.byProject[item.Project] = 0;
      }
      summary.byProject[item.Project]++;

      // By Month
      if (!summary.byMonth[item.Month]) {
        summary.byMonth[item.Month] = 0;
      }
      summary.byMonth[item.Month]++;

      // By Status
      if (!summary.byStatus[item['Upload Status']]) {
        summary.byStatus[item['Upload Status']] = 0;
      }
      summary.byStatus[item['Upload Status']]++;
    });

    return summary;
  }

  private transformDataForPivot(): any[] {
    if (!this.data || this.data.length === 0) {
      return [];
    }

    console.log('Transforming', this.data.length, 'poles for pivot table');

    return this.data.map((pole, index) => {
      try {
        const date = this.parseDate(pole.createdAt || pole.dateInstalled);
        const monthNames = [
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

        // Determine upload status more robustly
        let uploadStatus = 'Pending';
        if (pole.allUploadsComplete) {
          uploadStatus = 'Complete';
        } else if (pole.uploadProgress && pole.uploadProgress > 0) {
          uploadStatus = 'In Progress';
        }

        const transformedPole = {
          // Basic fields
          'Pole ID': pole.vfPoleId || pole.poleNumber || `Pole-${index + 1}`,
          'Pole Number': pole.poleNumber || 'N/A',
          Project: pole.projectName || pole.projectCode || 'Unknown Project',
          Contractor: pole.contractorName || 'Unassigned',
          Zone: pole.zone || 'N/A',
          Type: pole.poleType || 'Unknown',
          PON: pole.pon || 'N/A',

          // Status fields
          'Upload Status': uploadStatus,
          'QA Status': pole.qualityChecked ? 'Checked' : 'Pending',
          'Installation Status': pole.installationStatus || 'Pending',

          // Date fields
          Month: monthNames[date.getMonth()],
          Year: date.getFullYear().toString(),
          Week: this.getWeekNumber(date),
          Quarter: 'Q' + Math.floor(date.getMonth() / 3 + 1),
          Date: date.toLocaleDateString(),

          // Numeric fields
          'Drop Count': Number(pole.dropCount) || 0,
          'Max Capacity': Number(pole.maxCapacity) || 12,
          'Capacity Used %':
            pole.dropCount && pole.maxCapacity
              ? Math.round((pole.dropCount / pole.maxCapacity) * 100)
              : 0,
          'Upload Progress %': Math.round(pole.uploadProgress || 0),
          'Photos Uploaded': pole.uploadedCount || 0,
          'Days Since Creation': Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)),

          // Additional fields
          'Working Team': pole.workingTeam || 'N/A',
          Priority: pole.priority || 'Normal',

          // Location
          'Has GPS': pole.location ? 'Yes' : 'No',
          Location: pole.location || 'No GPS',

          // Count field for aggregation
          Count: 1,
        };

        return transformedPole;
      } catch (error) {
        console.warn('Error transforming pole at index', index, ':', error);
        return {
          'Pole ID': `Error-${index}`,
          Project: 'Error',
          Month: 'Unknown',
          Year: new Date().getFullYear().toString(),
          Count: 1,
        };
      }
    });
  }

  private parseDate(dateField: any): Date {
    if (!dateField) return new Date();

    // Handle Firestore timestamp
    if (dateField.seconds) {
      return new Date(dateField.seconds * 1000);
    }

    // Handle regular Date
    if (dateField instanceof Date) {
      return dateField;
    }

    // Handle string date
    if (typeof dateField === 'string') {
      return new Date(dateField);
    }

    return new Date();
  }

  private getWeekNumber(date: Date): string {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + firstJan.getDay() + 1) / 7);
    return `Week ${weekNumber}`;
  }
}

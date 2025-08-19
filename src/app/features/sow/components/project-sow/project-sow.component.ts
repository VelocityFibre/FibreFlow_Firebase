import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NeonService } from '@app/core/services/neon.service';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

interface SOWPole {
  id: number;
  project_id: string;
  pole_number: string;
  status: string;
  latitude: string;
  longitude: string;
  pon_no: string;
  zone_no: string;
  created_date: string;
  imported_at: string;
  designer: string;
}

interface SOWDrop {
  id: number;
  project_id: string;
  drop_number: string;
  pole_number: string;
  premises_id: string;
  address: string;
  status: string;
  latitude: string | null;
  longitude: string | null;
  distance_to_pole: string;
  imported_at: string;
  designer: string;
}

interface SOWFibre {
  segment_id: string;
  from_point: string;
  to_point: string;
  distance: number;
  fibre_type: string;
  contractor: string;
  completed: string;
}

@Component({
  selector: 'app-project-sow',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="sow-container">
      <!-- SOW Summary Cards -->
      <div class="summary-cards" *ngIf="sowSummary$ | async as summary">
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon poles">
              <mat-icon>electrical_services</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ summary.totalPoles }}</div>
              <div class="summary-label">Poles</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon drops">
              <mat-icon>home</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ summary.totalDropsWithONT }}</div>
              <div class="summary-label">Drops (with ONT)</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>



      <!-- Loading State -->
      <div class="loading-container" *ngIf="loading()">
        <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        <p>Loading SOW data...</p>
      </div>
    </div>
  `,
  styleUrls: ['./project-sow.component.scss']
})
export class ProjectSOWComponent implements OnInit {
  @Input() projectId!: string;
  
  private neonService = inject(NeonService);
  
  loading = signal(true);
  poles$!: Observable<SOWPole[]>;
  drops$!: Observable<SOWDrop[]>;
  fibre$!: Observable<SOWFibre[]>;
  sowSummary$!: Observable<any>;
  
  ngOnInit() {
    this.loadSOWData();
  }
  
  private loadSOWData() {
    if (!this.projectId) {
      console.warn('No project ID provided for SOW data loading');
      this.loading.set(false);
      return;
    }

    // Check if Neon service is configured
    try {
      // Debug: Check what data exists in tables
      console.log('🔍 Checking SOW data for project:', this.projectId);
      
      // First check what data exists overall
      this.neonService.query('SELECT COUNT(*) as total FROM sow_poles').pipe(
        catchError(() => of([{total: 0}]))
      ).subscribe(result => {
        console.log('📊 Total poles in sow_poles table:', result[0]?.total || 0);
      });
      
      this.neonService.query('SELECT COUNT(*) as total FROM sow_drops').pipe(
        catchError(() => of([{total: 0}]))
      ).subscribe(result => {
        console.log('📊 Total drops in sow_drops table:', result[0]?.total || 0);
      });
      
      this.neonService.query('SELECT COUNT(*) as total FROM sow_fibre').pipe(
        catchError(() => of([{total: 0}]))
      ).subscribe(result => {
        console.log('📊 Total fibre in sow_fibre table:', result[0]?.total || 0);
      });
      
      // Debug: Check what project_ids actually exist in the database
      this.neonService.query('SELECT DISTINCT project_id FROM sow_poles LIMIT 10').pipe(
        catchError(() => of([]))
      ).subscribe(result => {
        console.log('🔍 Available project IDs in sow_poles:', result.map(r => r.project_id));
      });
      
      // Check project-specific data
      this.neonService.query(
        `SELECT COUNT(*) as total FROM sow_poles WHERE project_id = '${this.projectId.replace(/'/g, "''")}'`
      ).pipe(
        catchError(() => of([{total: 0}]))
      ).subscribe(result => {
        console.log('🎯 Poles for project', this.projectId, ':', result[0]?.total || 0);
      });
      
      // Load poles with better error handling
      this.poles$ = this.neonService.query<SOWPole>(
        `SELECT * FROM sow_poles WHERE project_id = '${this.projectId.replace(/'/g, "''")}' ORDER BY pole_number`
      ).pipe(
        catchError(error => {
          console.error('Error loading poles from sow_poles table:', error);
          console.info('This is expected if SOW data has not been imported yet');
          return of([]);
        }),
        tap(poles => {
          console.log('Loaded poles for project', this.projectId, ':', poles.length);
          if (poles.length > 0) {
            console.log('First few poles:', poles.slice(0, 3));
          }
        })
      );
      
      // Load drops with better error handling
      this.drops$ = this.neonService.query<SOWDrop>(
        `SELECT * FROM sow_drops WHERE project_id = '${this.projectId.replace(/'/g, "''")}' ORDER BY drop_number`
      ).pipe(
        catchError(error => {
          console.error('Error loading drops from sow_drops table:', error);
          console.info('This is expected if SOW data has not been imported yet');
          return of([]);
        }),
        tap(drops => {
          console.log('Loaded drops for project', this.projectId, ':', drops.length);
          if (drops.length > 0) {
            console.log('First few drops:', drops.slice(0, 3));
          }
        })
      );
      
      // Load fibre with better error handling
      this.fibre$ = this.neonService.query<SOWFibre>(
        `SELECT * FROM sow_fibre WHERE project_id = '${this.projectId.replace(/'/g, "''")}' ORDER BY segment_id`
      ).pipe(
        catchError(error => {
          console.error('Error loading fibre from sow_fibre table:', error);
          console.info('This is expected if SOW data has not been imported yet');
          return of([]);
        }),
        tap(fibre => {
          console.log('Loaded fibre segments for project', this.projectId, ':', fibre.length);
          if (fibre.length > 0) {
            console.log('First few fibre:', fibre.slice(0, 3));
          }
        })
      );
    } catch (error) {
      console.error('Neon service not configured:', error);
      // Fallback to empty data
      this.poles$ = of([]);
      this.drops$ = of([]);
      this.fibre$ = of([]);
      
      // Empty data handled by observables
    }
    
    // Create summary
    this.sowSummary$ = combineLatest([this.poles$, this.drops$, this.fibre$]).pipe(
      map(([poles, drops, fibre]) => {
        // Filter drops to only those with ONT references
        const dropsWithONT = drops.filter(drop => drop.address?.includes('ONT'));
        
        return {
          totalPoles: poles.length,
          totalDropsWithONT: dropsWithONT.length,
          totalDrops: drops.length,
          totalFibre: fibre.length,
          totalDistance: Math.round(fibre.reduce((sum, f) => sum + (parseFloat(String(f.distance)) || 0), 0))
        };
      }),
      tap(() => this.loading.set(false))
    );
  }
  
}
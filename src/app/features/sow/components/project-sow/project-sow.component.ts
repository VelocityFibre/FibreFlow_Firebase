import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NeonService } from '@app/core/services/neon.service';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

interface SOWPole {
  pole_number: string;
  status: string;
  latitude: number;
  longitude: number;
  zone_no: string;
  pon_no: string;
}

interface SOWDrop {
  drop_number: string;
  pole_number: string;
  address: string;
  status: string;
  distance_to_pole: number;
}

interface SOWFibre {
  segment_id: string;
  from_point: string;
  to_point: string;
  distance: number;
  fibre_type: string;
}

@Component({
  selector: 'app-project-sow',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="sow-container">
      <!-- SOW Summary Cards -->
      <div class="summary-cards" *ngIf="sowSummary$ | async as summary">
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon poles">
              <mat-icon>cell_tower</mat-icon>
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
              <div class="summary-value">{{ summary.totalDrops }}</div>
              <div class="summary-label">Drops</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon fibre">
              <mat-icon>cable</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ summary.totalFibre }}</div>
              <div class="summary-label">Fibre Segments</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon distance">
              <mat-icon>straighten</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ summary.totalDistance }}m</div>
              <div class="summary-label">Total Distance</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- No Data Message -->
      <div class="no-data-container" *ngIf="(sowSummary$ | async) && !(hasData$ | async)">
        <mat-card class="no-data-card">
          <mat-card-content>
            <mat-icon class="no-data-icon">description</mat-icon>
            <h3>No SOW Data Available</h3>
            <p>SOW data has not been imported for this project yet.</p>
            <p class="import-note">Please contact your administrator to import the SOW Excel files.</p>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Data Tabs -->
      <mat-tab-group *ngIf="hasData$ | async" class="sow-tabs">
        <!-- Poles Tab -->
        <mat-tab label="Poles">
          <div class="tab-content">
            <div class="table-container" *ngIf="poles$ | async as poles">
              <table mat-table [dataSource]="poles" class="sow-table">
                <ng-container matColumnDef="pole_number">
                  <th mat-header-cell *matHeaderCellDef>Pole Number</th>
                  <td mat-cell *matCellDef="let pole">{{ pole.pole_number }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let pole">
                    <mat-chip [ngClass]="getStatusClass(pole.status)">
                      {{ pole.status }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="zone">
                  <th mat-header-cell *matHeaderCellDef>Zone</th>
                  <td mat-cell *matCellDef="let pole">{{ pole.zone_no || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="pon">
                  <th mat-header-cell *matHeaderCellDef>PON</th>
                  <td mat-cell *matCellDef="let pole">{{ pole.pon_no || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="location">
                  <th mat-header-cell *matHeaderCellDef>Location</th>
                  <td mat-cell *matCellDef="let pole">
                    <span *ngIf="pole.latitude && pole.longitude">
                      {{ pole.latitude.toFixed(6) }}, {{ pole.longitude.toFixed(6) }}
                    </span>
                    <span *ngIf="!pole.latitude || !pole.longitude">-</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="poleColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: poleColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-tab>

        <!-- Drops Tab -->
        <mat-tab label="Drops">
          <div class="tab-content">
            <div class="table-container" *ngIf="drops$ | async as drops">
              <table mat-table [dataSource]="drops" class="sow-table">
                <ng-container matColumnDef="drop_number">
                  <th mat-header-cell *matHeaderCellDef>Drop Number</th>
                  <td mat-cell *matCellDef="let drop">{{ drop.drop_number }}</td>
                </ng-container>

                <ng-container matColumnDef="pole_number">
                  <th mat-header-cell *matHeaderCellDef>Pole</th>
                  <td mat-cell *matCellDef="let drop">{{ drop.pole_number || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="address">
                  <th mat-header-cell *matHeaderCellDef>Address</th>
                  <td mat-cell *matCellDef="let drop">{{ drop.address || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let drop">
                    <mat-chip [ngClass]="getStatusClass(drop.status)">
                      {{ drop.status }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="distance">
                  <th mat-header-cell *matHeaderCellDef>Distance</th>
                  <td mat-cell *matCellDef="let drop">{{ drop.distance_to_pole || 0 }}m</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="dropColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: dropColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-tab>

        <!-- Fibre Tab -->
        <mat-tab label="Fibre">
          <div class="tab-content">
            <div class="table-container" *ngIf="fibre$ | async as fibre">
              <table mat-table [dataSource]="fibre" class="sow-table">
                <ng-container matColumnDef="segment_id">
                  <th mat-header-cell *matHeaderCellDef>Segment ID</th>
                  <td mat-cell *matCellDef="let segment">{{ segment.segment_id }}</td>
                </ng-container>

                <ng-container matColumnDef="from_point">
                  <th mat-header-cell *matHeaderCellDef>From</th>
                  <td mat-cell *matCellDef="let segment">{{ segment.from_point }}</td>
                </ng-container>

                <ng-container matColumnDef="to_point">
                  <th mat-header-cell *matHeaderCellDef>To</th>
                  <td mat-cell *matCellDef="let segment">{{ segment.to_point }}</td>
                </ng-container>

                <ng-container matColumnDef="distance">
                  <th mat-header-cell *matHeaderCellDef>Distance</th>
                  <td mat-cell *matCellDef="let segment">{{ segment.distance || 0 }}m</td>
                </ng-container>

                <ng-container matColumnDef="fibre_type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let segment">{{ segment.fibre_type || '-' }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="fibreColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: fibreColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

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
  hasData$!: Observable<boolean>;
  
  poleColumns = ['pole_number', 'status', 'zone', 'pon', 'location'];
  dropColumns = ['drop_number', 'pole_number', 'address', 'status', 'distance'];
  fibreColumns = ['segment_id', 'from_point', 'to_point', 'distance', 'fibre_type'];
  
  ngOnInit() {
    this.loadSOWData();
  }
  
  private loadSOWData() {
    // Load poles
    this.poles$ = this.neonService.query<SOWPole>(
      'SELECT * FROM sow_poles WHERE project_id = $1 ORDER BY pole_number',
      [this.projectId]
    ).pipe(
      catchError(error => {
        console.error('Error loading poles:', error);
        return of([]);
      })
    );
    
    // Load drops
    this.drops$ = this.neonService.query<SOWDrop>(
      'SELECT * FROM sow_drops WHERE project_id = $1 ORDER BY drop_number',
      [this.projectId]
    ).pipe(
      catchError(error => {
        console.error('Error loading drops:', error);
        return of([]);
      })
    );
    
    // Load fibre
    this.fibre$ = this.neonService.query<SOWFibre>(
      'SELECT * FROM sow_fibre WHERE project_id = $1 ORDER BY segment_id',
      [this.projectId]
    ).pipe(
      catchError(error => {
        console.error('Error loading fibre:', error);
        return of([]);
      })
    );
    
    // Create summary
    this.sowSummary$ = combineLatest([this.poles$, this.drops$, this.fibre$]).pipe(
      map(([poles, drops, fibre]) => ({
        totalPoles: poles.length,
        totalDrops: drops.length,
        totalFibre: fibre.length,
        totalDistance: fibre.reduce((sum, f) => sum + (f.distance || 0), 0)
      })),
      tap(() => this.loading.set(false))
    );
    
    // Check if has data
    this.hasData$ = this.sowSummary$.pipe(
      map(summary => summary.totalPoles > 0 || summary.totalDrops > 0 || summary.totalFibre > 0)
    );
  }
  
  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved')) return 'status-approved';
    if (statusLower.includes('installed')) return 'status-completed';
    if (statusLower.includes('progress')) return 'status-progress';
    if (statusLower.includes('pending')) return 'status-pending';
    return 'status-default';
  }
}
import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnhancedGPSService } from '../../services/enhanced-gps.service';

@Component({
  selector: 'app-gps-accuracy',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="gps-accuracy" [class.good]="isGood()" [class.poor]="isPoor()">
      @if (status$ | async; as status) {
        @if (status.isTracking) {
          <mat-spinner diameter="20"></mat-spinner>
          <span>Getting GPS...</span>
        } @else if (status.lastPosition) {
          <mat-icon [matTooltip]="getTooltip(status)">
            {{ getIcon(status.lastPosition.accuracy) }}
          </mat-icon>
          <span>{{ formatAccuracy(status.lastPosition.accuracy) }}</span>
        } @else if (status.lastError) {
          <mat-icon color="warn" [matTooltip]="status.lastError">error</mat-icon>
          <span>GPS Error</span>
        } @else {
          <mat-icon>location_off</mat-icon>
          <span>No GPS</span>
        }
        
        @if (status.attempts > 1 && status.isTracking) {
          <span class="attempts">(Attempt {{ status.attempts }})</span>
        }
      }
    </div>
  `,
  styles: [`
    .gps-accuracy {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--mat-sys-surface-variant);
      border-radius: 20px;
      font-size: 14px;
      
      &.good {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        
        mat-icon {
          color: var(--mat-sys-primary);
        }
      }
      
      &.poor {
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
        
        mat-icon {
          color: var(--mat-sys-error);
        }
      }
      
      mat-spinner {
        margin-right: 4px;
      }
      
      .attempts {
        font-size: 12px;
        color: var(--mat-sys-outline);
      }
    }
  `]
})
export class GPSAccuracyComponent {
  @Input() requiredAccuracy = 5; // 5 meters default
  
  private gpsService = inject(EnhancedGPSService);
  
  status$ = this.gpsService.status$;
  
  isGood(): boolean {
    const status = this.gpsService.currentStatus;
    return status.lastPosition ? status.lastPosition.accuracy <= this.requiredAccuracy : false;
  }
  
  isPoor(): boolean {
    const status = this.gpsService.currentStatus;
    return status.lastPosition ? status.lastPosition.accuracy > this.requiredAccuracy * 2 : false;
  }
  
  getIcon(accuracy: number): string {
    if (accuracy <= this.requiredAccuracy) {
      return 'gps_fixed';
    } else if (accuracy <= this.requiredAccuracy * 2) {
      return 'gps_not_fixed';
    } else {
      return 'location_searching';
    }
  }
  
  formatAccuracy(accuracy: number): string {
    return this.gpsService.formatAccuracy(accuracy);
  }
  
  getTooltip(status: any): string {
    if (!status.lastPosition) return '';
    
    const coords = this.gpsService.formatCoordinates(status.lastPosition);
    const acceptable = this.gpsService.isAccuracyAcceptable(status.lastPosition.accuracy, this.requiredAccuracy)
      ? 'Acceptable' : 'Poor';
    
    return `${coords}\nAccuracy: ${this.formatAccuracy(status.lastPosition.accuracy)} (${acceptable})\nBest: ${this.formatAccuracy(status.bestAccuracy)}`;
  }
}
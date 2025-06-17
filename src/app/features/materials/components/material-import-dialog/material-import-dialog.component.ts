import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MaterialService } from '../../services/material.service';
import { MasterMaterial } from '../../models/material.model';

@Component({
  selector: 'app-material-import-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title>Import Materials - Coming Soon</h2>

    <mat-dialog-content>
      <div class="import-placeholder">
        <mat-icon>cloud_upload</mat-icon>
        <p>Material import functionality will be available soon</p>
        <p class="hint">You'll be able to import materials from CSV files</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .import-placeholder {
        text-align: center;
        padding: 48px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: rgb(var(--ff-muted-foreground));
          margin-bottom: 16px;
        }

        p {
          margin: 8px 0;
          color: rgb(var(--ff-foreground));
        }

        .hint {
          color: rgb(var(--ff-muted-foreground));
          font-size: 14px;
        }
      }
    `,
  ],
})
export class MaterialImportDialogComponent {
  private dialogRef = inject(MatDialogRef<MaterialImportDialogComponent>);

  close() {
    this.dialogRef.close();
  }
}

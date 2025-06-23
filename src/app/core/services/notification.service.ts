import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  private readonly defaultConfig: MatSnackBarConfig = {
    duration: 4000,
    horizontalPosition: 'end',
    verticalPosition: 'bottom',
  };

  success(message: string, action?: string): void {
    this.show(message, action, 'success');
  }

  error(message: string, action?: string): void {
    this.show(message, action, 'error');
  }

  showError(message: string, action?: string): void {
    this.error(message, action);
  }

  warning(message: string, action?: string): void {
    this.show(message, action, 'warning');
  }

  warn(message: string, action?: string): void {
    this.warning(message, action);
  }

  info(message: string, action?: string): void {
    this.show(message, action, 'info');
  }

  private show(message: string, action: string = 'Dismiss', type: NotificationType): void {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      panelClass: [`${type}-snackbar`],
    };

    // Errors should stay longer
    if (type === 'error') {
      config.duration = 6000;
    }

    this.snackBar.open(message, action, config);
  }

  // For operations that might take time
  showWithProgress(message: string): void {
    this.snackBar.open(message, undefined, {
      ...this.defaultConfig,
      duration: undefined, // Stay until dismissed
      panelClass: ['progress-snackbar'],
    });
  }

  dismiss(): void {
    this.snackBar.dismiss();
  }
}

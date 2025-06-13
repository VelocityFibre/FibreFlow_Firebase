import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService, Theme } from '../../../core/services/theme.service';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatMenuModule, MatIconModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="themeMenu"
      [matTooltip]="'Current theme: ' + currentThemeLabel"
      class="theme-switcher-button"
    >
      <mat-icon>{{ currentThemeIcon }}</mat-icon>
    </button>

    <mat-menu #themeMenu="matMenu" class="theme-menu">
      <div class="theme-menu-header">
        <h3 class="theme-menu-title">Choose Theme</h3>
      </div>

      <button
        *ngFor="let theme of themes"
        mat-menu-item
        (click)="setTheme(theme.value)"
        class="theme-option"
        [class.active]="currentTheme === theme.value"
      >
        <mat-icon class="theme-icon">{{ theme.icon }}</mat-icon>
        <div class="theme-info">
          <span class="theme-label">{{ theme.label }}</span>
          <span class="theme-description">{{ theme.description }}</span>
        </div>
        <mat-icon *ngIf="currentTheme === theme.value" class="check-icon">check</mat-icon>
      </button>
    </mat-menu>
  `,
  styles: [
    `
      @use '../../../../styles/theme-functions' as theme;
      @use '../../../../styles/spacing' as spacing;

      .theme-switcher-button {
        color: theme.ff-rgb(foreground);

        &:hover {
          background-color: theme.ff-rgba(muted, 0.5);
        }
      }

      ::ng-deep .theme-menu {
        margin-top: spacing.ff-spacing(sm);

        .mat-mdc-menu-content {
          padding: 0 !important;
        }
      }

      .theme-menu-header {
        padding: spacing.ff-spacing(md) spacing.ff-spacing(lg);
        border-bottom: 1px solid theme.ff-rgb(border);
        background-color: theme.ff-rgba(muted, 0.3);
      }

      .theme-menu-title {
        margin: 0;
        font-size: spacing.ff-font-size(sm);
        font-weight: spacing.ff-font-weight(medium);
        color: theme.ff-rgb(muted-foreground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .theme-option {
        display: flex !important;
        align-items: center !important;
        gap: spacing.ff-spacing(md) !important;
        padding: spacing.ff-spacing(md) spacing.ff-spacing(lg) !important;
        min-height: 56px !important;

        &:hover {
          background-color: theme.ff-rgba(muted, 0.5) !important;
        }

        &.active {
          background-color: theme.ff-rgba(primary, 0.1) !important;

          .theme-icon {
            color: theme.ff-rgb(primary);
          }
        }
      }

      .theme-icon {
        color: theme.ff-rgb(muted-foreground);
        margin-right: 0 !important;
      }

      .theme-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: spacing.ff-spacing(xs);
      }

      .theme-label {
        font-size: spacing.ff-font-size(base);
        font-weight: spacing.ff-font-weight(medium);
        color: theme.ff-rgb(foreground);
      }

      .theme-description {
        font-size: spacing.ff-font-size(sm);
        color: theme.ff-rgb(muted-foreground);
      }

      .check-icon {
        color: theme.ff-rgb(primary);
        margin-left: auto !important;
      }
    `,
  ],
})
export class ThemeSwitcherComponent {
  private themeService = inject(ThemeService);

  themes: ThemeOption[] = [
    {
      value: 'light',
      label: 'Light',
      icon: 'light_mode',
      description: 'Clean and bright interface',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: 'dark_mode',
      description: 'Easy on the eyes in low light',
    },
    {
      value: 'vf',
      label: 'Velocity Fibre',
      icon: 'speed',
      description: 'Brand colors with blue theme',
    },
    {
      value: 'fibreflow',
      label: 'FibreFlow',
      icon: 'gradient',
      description: 'Modern indigo accent theme',
    },
  ];

  get currentTheme(): Theme {
    return this.themeService.getTheme();
  }

  get currentThemeLabel(): string {
    const theme = this.themes.find((t) => t.value === this.currentTheme);
    return theme?.label || 'Light';
  }

  get currentThemeIcon(): string {
    const theme = this.themes.find((t) => t.value === this.currentTheme);
    return theme?.icon || 'light_mode';
  }

  setTheme(theme: Theme) {
    this.themeService.setTheme(theme);
  }
}

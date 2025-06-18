import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AppShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-shell></app-shell>
  `,
  styles: [],
})
export class AppComponent {
  title = 'FibreFlow';

  private themeService = inject(ThemeService);

  constructor() {
    console.log('FibreFlow: AppComponent constructor called');

    // Ensure theme is initialized to light by default
    this.themeService.setTheme('light');
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { DevPanel } from './shared/components/dev-panel/dev-panel';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AppShellComponent, DevPanel],
  template: `
    <app-shell></app-shell>
    <app-dev-panel></app-dev-panel>
  `,
  styles: [],
})
export class AppComponent {
  title = 'FibreFlow';

  constructor() {
    console.log('FibreFlow: AppComponent constructor called');
    // Theme initialization moved to AppInitializerService to prevent NG0200
  }
}

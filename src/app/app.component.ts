import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AppShellComponent],
  template: ` <app-shell></app-shell> `,
  styles: [],
})
export class AppComponent {
  title = 'FibreFlow';

  constructor() {
    console.log('FibreFlow: AppComponent constructor called');
    // Theme initialization moved to AppInitializerService to prevent NG0200
  }
}

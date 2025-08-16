import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SOWWizardComponent } from '../sow-wizard/sow-wizard.component';

@Component({
  selector: 'app-sow-create',
  standalone: true,
  imports: [CommonModule, SOWWizardComponent],
  template: `
    <app-sow-wizard [projectId]="projectId"></app-sow-wizard>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      background: #f5f5f5;
    }
  `]
})
export class SOWCreateComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  projectId = '';
  
  ngOnInit() {
    // Get project ID from route params
    this.projectId = this.route.snapshot.queryParamMap.get('projectId') || '';
    
    if (!this.projectId) {
      // If no project ID, redirect back to projects
      this.router.navigate(['/projects']);
    }
  }
}
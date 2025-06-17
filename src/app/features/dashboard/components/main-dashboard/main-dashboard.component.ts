import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectStatus } from '../../../../core/models/project.model';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatCardModule],
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.scss'],
})
export class MainDashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  
  activeProjectsCount = 0;
  totalProjectsCount = 0;

  ngOnInit() {
    // Get all projects and count them
    this.projectService.getProjects().subscribe(projects => {
      // For now, just show total count of all projects
      this.activeProjectsCount = projects.length;
      
      // Log to see what status values we actually have
      console.log('Project statuses:', projects.map(p => p.status));
    });
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-task-management-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px;">
      <h1>Task Management Test Component</h1>
      <p>If you see this, the route is working!</p>
    </div>
  `,
})
export class TaskManagementTestComponent {
  constructor() {
    console.log('TaskManagementTestComponent - Constructor called');
  }
}

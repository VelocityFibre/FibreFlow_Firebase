import { Injectable } from '@angular/core';
import { Observable, of, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { 
  DashboardMetrics, 
  Alert, 
  AlertType, 
  AlertSeverity,
  Activity,
  ActivityType,
  ModuleCard
} from '../models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardMockService {
  
  getDashboardMetrics(): Observable<DashboardMetrics> {
    // Simulate real-time updates every 30 seconds
    return interval(30000).pipe(
      startWith(0),
      map(() => this.generateMockMetrics())
    );
  }

  getModuleCards(): Observable<ModuleCard[]> {
    return of([
      {
        title: 'Projects',
        icon: 'folder',
        route: '/projects',
        color: '#3B82F6',
        description: 'Manage fiber installation projects',
        metrics: [
          { label: 'Active', value: 12 },
          { label: 'On Hold', value: 3 }
        ]
      },
      {
        title: 'Staff',
        icon: 'badge',
        route: '/staff',
        color: '#10B981',
        description: 'Team management and scheduling',
        metrics: [
          { label: 'Available', value: 18 },
          { label: 'On Site', value: 24 }
        ]
      },
      {
        title: 'Inventory',
        icon: 'inventory_2',
        route: '/inventory',
        color: '#F59E0B',
        description: 'Stock levels and equipment',
        metrics: [
          { label: 'Low Stock', value: 5 },
          { label: 'Orders', value: 3 }
        ]
      },
      {
        title: 'Contractors',
        icon: 'engineering',
        route: '/contractors',
        color: '#8B5CF6',
        description: 'Contractor management and payments',
        metrics: [
          { label: 'Active', value: 8 },
          { label: 'Poles Today', value: 47 }
        ]
      },
      {
        title: 'Suppliers',
        icon: 'local_shipping',
        route: '/suppliers',
        color: '#EC4899',
        description: 'Supplier orders and deliveries',
        metrics: [
          { label: 'Pending', value: 4 },
          { label: 'In Transit', value: 2 }
        ]
      },
      {
        title: 'Reports',
        icon: 'analytics',
        route: '/reports',
        color: '#14B8A6',
        description: 'Analytics and reporting',
        metrics: [
          { label: 'This Week', value: 6 },
          { label: 'Scheduled', value: 2 }
        ]
      }
    ]);
  }

  private generateMockMetrics(): DashboardMetrics {
    const now = new Date();
    
    return {
      overview: {
        activeProjects: 12,
        completedThisMonth: 3,
        totalStaff: 42,
        availableToday: 18,
        criticalIssues: 2
      },
      poles: {
        plantedToday: Math.floor(Math.random() * 20) + 30,
        plannedToday: 55,
        weeklyProgress: [45, 52, 38, 65, 72, 48, this.getRandomInt(30, 80)],
        monthlyTarget: 1200,
        monthlyCompleted: 847,
        topContractors: [
          {
            contractorId: '1',
            contractorName: 'FiberTech Solutions',
            polesPlanted: 127,
            target: 150,
            percentage: 84.7
          },
          {
            contractorId: '2',
            contractorName: 'Network Builders Inc',
            polesPlanted: 98,
            target: 120,
            percentage: 81.7
          },
          {
            contractorId: '3',
            contractorName: 'CityFiber Contractors',
            polesPlanted: 89,
            target: 100,
            percentage: 89.0
          }
        ]
      },
      tasks: {
        overdueCount: 7,
        dueTodayCount: 15,
        dueThisWeekCount: 43,
        blockedCount: 4,
        completedTodayCount: 12
      },
      alerts: this.generateMockAlerts(),
      recentActivity: this.generateMockActivity()
    };
  }

  private generateMockAlerts(): Alert[] {
    const alerts: Alert[] = [
      {
        id: '1',
        type: AlertType.TASK_OVERDUE,
        severity: AlertSeverity.CRITICAL,
        title: 'Critical tasks overdue in Downtown Project',
        description: '3 critical path tasks are overdue by more than 5 days',
        projectId: 'proj-1',
        projectName: 'Downtown Fiber Expansion',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        link: '/projects/proj-1'
      },
      {
        id: '2',
        type: AlertType.BUDGET_OVERRUN,
        severity: AlertSeverity.HIGH,
        title: 'Budget exceeded for Westside Installation',
        description: 'Project budget exceeded by 15% due to equipment costs',
        projectId: 'proj-2',
        projectName: 'Westside Fiber Installation',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        link: '/projects/proj-2'
      },
      {
        id: '3',
        type: AlertType.STOCK_LOW,
        severity: AlertSeverity.HIGH,
        title: 'Low stock: Fiber optic cable',
        description: 'Single mode fiber cable below minimum level - 500m remaining',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        link: '/inventory/items/fiber-sm-01'
      },
      {
        id: '4',
        type: AlertType.RESOURCE_BLOCKED,
        severity: AlertSeverity.MEDIUM,
        title: 'Permit delay in North District',
        description: 'Waiting for city permit approval for pole installation',
        projectId: 'proj-3',
        projectName: 'North District Connect',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        link: '/projects/proj-3'
      }
    ];

    return alerts;
  }

  private generateMockActivity(): Activity[] {
    const activities: Activity[] = [
      {
        id: '1',
        type: ActivityType.POLE_PLANTED,
        description: 'Planted 15 poles in Sector A',
        user: 'John Smith',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        projectId: 'proj-1',
        projectName: 'Downtown Fiber Expansion'
      },
      {
        id: '2',
        type: ActivityType.TASK_COMPLETED,
        description: 'Completed fiber splicing for Building 42',
        user: 'Sarah Johnson',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        projectId: 'proj-2',
        projectName: 'Westside Fiber Installation'
      },
      {
        id: '3',
        type: ActivityType.PROJECT_CREATED,
        description: 'Created new project: East End Connection',
        user: 'Mike Davis',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: '4',
        type: ActivityType.ISSUE_RESOLVED,
        description: 'Resolved cable shortage issue',
        user: 'Emily Brown',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        projectId: 'proj-1',
        projectName: 'Downtown Fiber Expansion'
      },
      {
        id: '5',
        type: ActivityType.STAFF_ASSIGNED,
        description: 'Assigned 3 technicians to urgent repair',
        user: 'Tom Wilson',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
      }
    ];

    return activities;
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
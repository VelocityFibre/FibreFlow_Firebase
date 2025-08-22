import { PageHeader } from '@/shared/components/PageHeader';
import { StatsCard } from '@/shared/components/StatsCard';
import { 
  FolderOpen, 
  Users, 
  Package, 
  HardHat,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export function DashboardPage() {
  // Mock data for now - will be replaced with real data
  const stats = [
    { 
      title: 'Active Projects', 
      value: 12, 
      icon: FolderOpen,
      trend: { value: 8, isPositive: true },
      description: '3 new this month'
    },
    { 
      title: 'Total Staff', 
      value: 47, 
      icon: Users,
      description: '5 on leave'
    },
    { 
      title: 'Stock Items', 
      value: 234, 
      icon: Package,
      trend: { value: 12, isPositive: false },
      description: '18 low stock'
    },
    { 
      title: 'Contractors', 
      value: 8, 
      icon: HardHat,
      description: '2 pending approval'
    },
  ];

  const recentActivities = [
    { id: 1, type: 'success', message: 'New pole installation completed at Lawley P.B167', time: '2 hours ago' },
    { id: 2, type: 'info', message: 'Stock order #SO-234 delivered', time: '4 hours ago' },
    { id: 3, type: 'warning', message: 'Low stock alert: Fiber cable (500m)', time: '6 hours ago' },
    { id: 4, type: 'success', message: 'Project "Mall Installation" reached 75% completion', time: '1 day ago' },
  ];

  return (
    <div className="p-8">
      <PageHeader 
        title="Dashboard" 
        description="Welcome back! Here's what's happening with your projects."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-1">
                  {activity.type === 'success' && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {activity.type === 'warning' && <AlertCircle className="h-5 w-5 text-warning" />}
                  {activity.type === 'info' && <TrendingUp className="h-5 w-5 text-info" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
              Create New Project
            </button>
            <button className="w-full px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium">
              Add Staff Member
            </button>
            <button className="w-full px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium">
              Record Stock Movement
            </button>
            <button className="w-full px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium">
              View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Project Progress */}
      <div className="mt-6 bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Active Projects Progress</h2>
        <div className="space-y-4">
          {[
            { name: 'Lawley Installation', progress: 75, status: 'On Track' },
            { name: 'Mall Fiber Project', progress: 45, status: 'On Track' },
            { name: 'Office Park Network', progress: 30, status: 'Delayed' },
            { name: 'Residential Complex', progress: 90, status: 'Ahead' },
          ].map((project) => (
            <div key={project.name}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">{project.name}</h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  project.status === 'On Track' ? 'bg-success/10 text-success' :
                  project.status === 'Delayed' ? 'bg-destructive/10 text-destructive' :
                  'bg-info/10 text-info'
                }`}>
                  {project.status}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{project.progress}% complete</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
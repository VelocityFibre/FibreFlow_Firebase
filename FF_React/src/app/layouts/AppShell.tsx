import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  Users,
  Package,
  HardHat,
  MapPin,
  TrendingUp,
  Calendar,
  Settings,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { ThemeToggle } from '@shared/components';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Projects', icon: FolderOpen, path: '/projects' },
  { label: 'Staff', icon: Users, path: '/staff' },
  { label: 'Stock', icon: Package, path: '/stock' },
  { label: 'Contractors', icon: HardHat, path: '/contractors' },
  { label: 'Pole Tracker', icon: MapPin, path: '/pole-tracker' },
  { label: 'Daily Progress', icon: TrendingUp, path: '/daily-progress' },
  { label: 'Meetings', icon: Calendar, path: '/meetings' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-primary">FibreFlow</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile (placeholder for now) */}
        <div className="p-4 border-t border-border">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
              U
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="text-sm font-medium">User Name</p>
                <p className="text-xs text-muted-foreground">user@example.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight size={16} />
            <span className="text-foreground font-medium">
              {navItems.find(item => item.path === location.pathname)?.label || 'Page'}
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
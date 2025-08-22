import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { DashboardPage } from '@features/dashboard/pages/DashboardPage';

import { StaffPage } from '@features/staff/pages/StaffPage';

// Placeholder pages - we'll create these next
const ProjectsPage = () => <div className="p-8">Projects Page</div>;
const StockPage = () => <div className="p-8">Stock Management Page</div>;
const ContractorsPage = () => <div className="p-8">Contractors Page</div>;
const PoleTrackerPage = () => <div className="p-8">Pole Tracker Page</div>;
const DailyProgressPage = () => <div className="p-8">Daily Progress Page</div>;
const MeetingsPage = () => <div className="p-8">Meetings Page</div>;
const SettingsPage = () => <div className="p-8">Settings Page</div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'staff',
        element: <StaffPage />,
      },
      {
        path: 'stock',
        element: <StockPage />,
      },
      {
        path: 'contractors',
        element: <ContractorsPage />,
      },
      {
        path: 'pole-tracker',
        element: <PoleTrackerPage />,
      },
      {
        path: 'daily-progress',
        element: <DailyProgressPage />,
      },
      {
        path: 'meetings',
        element: <MeetingsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
import { Routes } from '@angular/router';

export const neonAgentRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/neon-agent-chat/neon-agent-chat.component').then(m => m.NeonAgentChatComponent),
    data: { title: 'Neon Database Agent' }
  }
];
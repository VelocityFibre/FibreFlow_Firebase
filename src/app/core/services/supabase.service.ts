import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Observable, from, map } from 'rxjs';
import { AuthService } from './auth.service';

export interface ProjectProgressData {
  build_milestones: any[];
  zone_progress: any[];
  daily_progress: any[];
  key_milestones: any[];
  prerequisites: any[];
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private authService = inject(AuthService);

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      environment.supabaseUrl || 'YOUR_SUPABASE_URL',
      environment.supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY'
    );
  }

  // Get project progress summary with complex SQL
  getProjectProgress(projectName: string = 'Lawley'): Observable<ProjectProgressData> {
    return from(
      this.supabase.rpc('get_project_progress_summary', {
        project_name: projectName
      })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      })
    );
  }

  // Get zone-by-zone analytics
  getZoneAnalytics(projectName: string = 'Lawley'): Observable<any[]> {
    return from(
      this.supabase
        .from('zone_progress_view')
        .select('*')
        .eq('project', projectName)
        .order('zone')
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      })
    );
  }

  // Get daily progress for last N days
  getDailyProgress(days: number = 30): Observable<any[]> {
    return from(
      this.supabase.rpc('get_daily_progress', {
        days_back: days
      })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      })
    );
  }

  // Run custom SQL query (restricted to SELECT only)
  runAnalyticsQuery(query: string): Observable<any[]> {
    // Security: Only allow SELECT queries
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }

    return from(
      this.supabase.rpc('run_analytics_query', {
        query_text: query
      })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      })
    );
  }

  // Get agent performance metrics
  getAgentPerformance(startDate?: string, endDate?: string): Observable<any[]> {
    let query = this.supabase
      .from('agent_performance_view')
      .select('*')
      .order('poles_handled', { ascending: false })
      .limit(20);

    if (startDate) {
      query = query.gte('first_action', startDate);
    }
    if (endDate) {
      query = query.lte('last_action', endDate);
    }

    return from(query).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      })
    );
  }

  // Get milestone status
  getMilestoneStatus(projectName: string = 'Lawley'): Observable<any[]> {
    return from(
      this.supabase
        .from('project_milestones')
        .select('*')
        .eq('project', projectName)
        .order('milestone_order')
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      })
    );
  }
}
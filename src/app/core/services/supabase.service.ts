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

  // Get project progress summary by aggregating data client-side
  getProjectProgress(projectName: string = 'Lawley'): Observable<ProjectProgressData> {
    // Fetch all status changes for the project with pagination
    return from(this.fetchAllRecords(projectName)).pipe(
      map(data => {
        // Aggregate data client-side to match the expected format
        return this.aggregateProjectData(data);
      })
    );
  }

  // Fetch all records with pagination to handle large datasets
  private async fetchAllRecords(projectName: string): Promise<any[]> {
    let allRecords: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('status_changes')
        .select('*')
        .eq('project_name', projectName)
        .range(from, from + limit - 1);

      if (error) throw error;

      allRecords = allRecords.concat(data || []);
      hasMore = (data?.length || 0) === limit;
      from += limit;
    }

    console.log(`Fetched ${allRecords.length} total records for ${projectName}`);
    return allRecords;
  }

  private aggregateProjectData(statusChanges: any[]): ProjectProgressData {
    // Build Milestones
    const buildMilestones = this.calculateBuildMilestones(statusChanges);
    
    // Zone Progress
    const zoneProgress = this.calculateZoneProgress(statusChanges);
    
    // Daily Progress (last 7 days)
    const dailyProgress = this.calculateDailyProgress(statusChanges);
    
    // Key Milestones
    const keyMilestones = this.calculateKeyMilestones(statusChanges);
    
    // Prerequisites (static for now)
    const prerequisites = [
      { prerequisite_name: 'Environmental Clearance', responsible: 'Project Manager', status: 'Complete' },
      { prerequisite_name: 'Wayleave Permissions', responsible: 'Legal Team', status: 'Complete' },
      { prerequisite_name: 'Equipment Procurement', responsible: 'Procurement', status: 'Complete' },
      { prerequisite_name: 'Contractor Onboarding', responsible: 'Operations', status: 'Complete' },
      { prerequisite_name: 'Safety Training', responsible: 'HSE Team', status: 'In Progress' },
      { prerequisite_name: 'Material Delivery', responsible: 'Logistics', status: 'In Progress' }
    ];

    return {
      build_milestones: buildMilestones,
      zone_progress: zoneProgress,
      daily_progress: dailyProgress,
      key_milestones: keyMilestones,
      prerequisites: prerequisites
    };
  }

  private calculateBuildMilestones(data: any[]): any[] {
    // Get unique poles and properties for scope
    const uniquePoles = new Set(data.filter(d => d.pole_number).map(d => d.pole_number));
    const uniqueProperties = new Set(data.filter(d => d.property_id).map(d => d.property_id));
    
    // Calculate permissions - count unique poles with "Pole Permission: Approved"
    const permissionPoles = new Set(
      data.filter(d => d.status === 'Pole Permission: Approved' && d.pole_number)
        .map(d => d.pole_number)
    );

    // Calculate sign ups - any status with "Sign Ups" (including approved, declined, rescheduled)
    const signupProperties = new Set(
      data.filter(d => d.status?.includes('Home Sign Ups') && d.property_id)
        .map(d => d.property_id)
    );

    // Calculate installations/connections - "Home Installation: Installed" means connected
    const connectedProperties = new Set(
      data.filter(d => d.status === 'Home Installation: Installed' && d.property_id)
        .map(d => d.property_id)
    );

    // Calculate installations in progress
    const installationInProgressProperties = new Set(
      data.filter(d => d.status === 'Home Installation: In Progress' && d.property_id)
        .map(d => d.property_id)
    );

    const milestones = [
      {
        name: 'Permissions',
        scope: uniquePoles.size,
        completed: permissionPoles.size,
        percentage: 0
      },
      {
        name: 'Poles Planted',
        scope: uniquePoles.size,
        completed: 0, // No "Pole Planted" status in the data
        percentage: 0
      },
      {
        name: 'Stringing',
        scope: uniquePoles.size,
        completed: 0, // No "Stringing Complete" status in the data
        percentage: 0
      },
      {
        name: 'Sign Ups',
        scope: uniqueProperties.size,
        completed: signupProperties.size,
        percentage: 0
      },
      {
        name: 'Drops',
        scope: uniqueProperties.size,
        completed: installationInProgressProperties.size + connectedProperties.size, // In progress + completed
        percentage: 0
      },
      {
        name: 'Connected',
        scope: uniqueProperties.size,
        completed: connectedProperties.size,
        percentage: 0
      }
    ];

    // Calculate percentages
    milestones.forEach(m => {
      m.percentage = m.scope > 0 ? Math.round((m.completed / m.scope) * 100) : 0;
    });

    return milestones;
  }

  private calculateZoneProgress(data: any[]): any[] {
    const zoneMap = new Map();
    
    data.forEach(record => {
      if (!record.zone) return;
      
      if (!zoneMap.has(record.zone)) {
        zoneMap.set(record.zone, {
          zone: record.zone,
          home_count: new Set(),
          poles: new Set(),
          permissions_completed: new Set(),
          poles_planted: new Set(),
          stringing_completed: new Set(),
          signups_completed: new Set(),
          drops_completed: new Set(),
          connected_completed: new Set()
        });
      }
      
      const zoneData = zoneMap.get(record.zone);
      
      if (record.property_id) zoneData.home_count.add(record.property_id);
      if (record.pole_number) zoneData.poles.add(record.pole_number);
      
      if (record.status?.includes('Permission') && record.status?.includes('Approved') && record.pole_number) {
        zoneData.permissions_completed.add(record.pole_number);
      }
      if (record.status?.includes('Pole') && record.status?.includes('Planted') && record.pole_number) {
        zoneData.poles_planted.add(record.pole_number);
      }
      if (record.status?.includes('Stringing') && record.status?.includes('Complete') && record.pole_number) {
        zoneData.stringing_completed.add(record.pole_number);
      }
      if (record.status?.includes('Sign') && record.status?.includes('Up') && record.property_id) {
        zoneData.signups_completed.add(record.property_id);
      }
      if (record.status?.includes('Drop') && record.status?.includes('Complete') && record.property_id) {
        zoneData.drops_completed.add(record.property_id);
      }
      if (record.status?.includes('Connected') && record.property_id) {
        zoneData.connected_completed.add(record.property_id);
      }
    });

    const zones = Array.from(zoneMap.values()).map(z => ({
      zone: z.zone,
      home_count: z.home_count.size,
      permission_scope: z.poles.size,
      pole_scope: z.poles.size,
      stringing_scope: z.poles.size,
      permissions_completed: z.permissions_completed.size,
      poles_planted: z.poles_planted.size,
      stringing_completed: z.stringing_completed.size,
      signups_completed: z.signups_completed.size,
      drops_completed: z.drops_completed.size,
      connected_completed: z.connected_completed.size,
      permissions_percentage: z.poles.size > 0 ? Math.round((z.permissions_completed.size / z.poles.size) * 100) : 0,
      poles_planted_percentage: z.poles.size > 0 ? Math.round((z.poles_planted.size / z.poles.size) * 100) : 0,
      stringing_percentage: z.poles.size > 0 ? Math.round((z.stringing_completed.size / z.poles.size) * 100) : 0,
      signups_percentage: z.home_count.size > 0 ? Math.round((z.signups_completed.size / z.home_count.size) * 100) : 0,
      drops_percentage: z.home_count.size > 0 ? Math.round((z.drops_completed.size / z.home_count.size) * 100) : 0,
      connected_percentage: z.home_count.size > 0 ? Math.round((z.connected_completed.size / z.home_count.size) * 100) : 0
    }));

    return zones.sort((a, b) => a.zone - b.zone);
  }

  private calculateDailyProgress(data: any[]): any[] {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyMap = new Map();
    
    data.forEach(record => {
      if (!record.date_stamp) return;
      
      const recordDate = new Date(record.date_stamp);
      if (recordDate < sevenDaysAgo) return;
      
      const dateStr = recordDate.toISOString().split('T')[0];
      
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          progress_date: dateStr,
          day_name: recordDate.toLocaleDateString('en-US', { weekday: 'short' }),
          permissions: new Set(),
          poles_planted: new Set(),
          stringing_d: new Set(),
          stringing_f: new Set(),
          sign_ups: new Set(),
          home_drops: new Set(),
          homes_connected: new Set()
        });
      }
      
      const dayData = dailyMap.get(dateStr);
      
      if (record.status?.includes('Permission') && record.status?.includes('Approved') && record.pole_number) {
        dayData.permissions.add(record.pole_number);
      }
      if (record.status?.includes('Pole') && record.status?.includes('Planted') && record.pole_number) {
        dayData.poles_planted.add(record.pole_number);
      }
      if (record.status?.includes('Stringing') && record.status?.includes('D') && record.pole_number) {
        dayData.stringing_d.add(record.pole_number);
      }
      if (record.status?.includes('Stringing') && record.status?.includes('F') && record.pole_number) {
        dayData.stringing_f.add(record.pole_number);
      }
      if (record.status?.includes('Sign') && record.status?.includes('Up') && record.property_id) {
        dayData.sign_ups.add(record.property_id);
      }
      if (record.status?.includes('Drop') && record.status?.includes('Complete') && record.property_id) {
        dayData.home_drops.add(record.property_id);
      }
      if (record.status?.includes('Connected') && record.property_id) {
        dayData.homes_connected.add(record.property_id);
      }
    });

    return Array.from(dailyMap.values())
      .map(d => ({
        progress_date: d.progress_date,
        day_name: d.day_name,
        permissions: d.permissions.size,
        poles_planted: d.poles_planted.size,
        stringing_d: d.stringing_d.size,
        stringing_f: d.stringing_f.size,
        sign_ups: d.sign_ups.size,
        home_drops: d.home_drops.size,
        homes_connected: d.homes_connected.size
      }))
      .sort((a, b) => b.progress_date.localeCompare(a.progress_date));
  }

  private calculateKeyMilestones(data: any[]): any[] {
    const firstDate = data.reduce((min, d) => {
      if (!d.date_stamp) return min;
      const date = new Date(d.date_stamp);
      return date < min ? date : min;
    }, new Date());

    const totalPoles = new Set(data.filter(d => d.pole_number).map(d => d.pole_number)).size;
    const permissionsCompleted = new Set(data.filter(d => d.status?.includes('Permission') && d.status?.includes('Approved')).map(d => d.pole_number)).size;
    const polesPlanted = new Set(data.filter(d => d.status?.includes('Pole') && d.status?.includes('Planted')).map(d => d.pole_number)).size;
    
    return [
      {
        milestone_name: 'Project Start',
        status: 'Complete',
        eta: firstDate.toISOString().split('T')[0],
        actual_date: firstDate.toISOString().split('T')[0]
      },
      {
        milestone_name: '50% Permissions',
        status: permissionsCompleted >= totalPoles * 0.5 ? 'Complete' : 'In Progress',
        eta: 'TBD',
        actual_date: permissionsCompleted >= totalPoles * 0.5 ? new Date().toISOString().split('T')[0] : 'Not Started'
      },
      {
        milestone_name: '100% Poles Planted',
        status: polesPlanted >= totalPoles ? 'Complete' : 'In Progress',
        eta: 'TBD',
        actual_date: polesPlanted >= totalPoles ? new Date().toISOString().split('T')[0] : 'Not Started'
      },
      {
        milestone_name: 'All Stringing Complete',
        status: 'In Progress',
        eta: 'TBD',
        actual_date: 'Not Started'
      }
    ];
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
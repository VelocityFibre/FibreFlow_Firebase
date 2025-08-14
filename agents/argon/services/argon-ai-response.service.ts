import { Injectable } from '@angular/core';
import { Observable, of, map } from 'rxjs';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryData?: any;
  executionTime?: number;
}

export interface QueryAnalysis {
  intent: string;
  dataType: string;
  summary: string;
  insights: string[];
  response: string;
}

@Injectable({
  providedIn: 'root'
})
export class ArgonAiResponseService {

  /**
   * Generate natural language response from query results
   */
  generateResponse(
    userQuestion: string, 
    queryResults: any, 
    targetDatabase: string
  ): Observable<QueryAnalysis> {
    return of(null).pipe(
      map(() => {
        const analysis = this.analyzeQuery(userQuestion, queryResults, targetDatabase);
        return analysis;
      })
    );
  }

  private analyzeQuery(
    userQuestion: string, 
    queryResults: any, 
    targetDatabase: string
  ): QueryAnalysis {
    const question = userQuestion.toLowerCase();
    const data = queryResults?.mergedData || [];
    
    // Analyze query intent
    const intent = this.detectIntent(question);
    const dataType = this.detectDataType(question, data);
    
    // Generate response based on intent and data
    let response = '';
    let insights: string[] = [];
    let summary = '';

    switch (intent) {
      case 'count':
        response = this.generateCountResponse(question, data, targetDatabase);
        summary = `Count query executed on ${targetDatabase}`;
        insights = this.generateCountInsights(data);
        break;
        
      case 'list':
        response = this.generateListResponse(question, data, targetDatabase);
        summary = `List query executed on ${targetDatabase}`;
        insights = this.generateListInsights(data);
        break;
        
      case 'status':
        response = this.generateStatusResponse(question, data, targetDatabase);
        summary = `Status analysis on ${targetDatabase}`;
        insights = this.generateStatusInsights(data);
        break;
        
      case 'analytics':
        response = this.generateAnalyticsResponse(question, data, targetDatabase);
        summary = `Analytics query on ${targetDatabase}`;
        insights = this.generateAnalyticsInsights(data);
        break;
        
      default:
        response = this.generateGenericResponse(question, data, targetDatabase);
        summary = `General query on ${targetDatabase}`;
        insights = this.generateGenericInsights(data);
    }

    return {
      intent,
      dataType,
      summary,
      insights,
      response
    };
  }

  private detectIntent(question: string): string {
    if (question.includes('how many') || question.includes('count') || question.includes('total')) {
      return 'count';
    }
    if (question.includes('list') || question.includes('show me') || question.includes('what are')) {
      return 'list';
    }
    if (question.includes('status') || question.includes('progress') || question.includes('state')) {
      return 'status';
    }
    if (question.includes('analytics') || question.includes('metrics') || question.includes('performance')) {
      return 'analytics';
    }
    return 'general';
  }

  private detectDataType(question: string, data: any[]): string {
    if (question.includes('project')) return 'projects';
    if (question.includes('task')) return 'tasks';
    if (question.includes('user') || question.includes('staff')) return 'users';
    if (question.includes('pole')) return 'poles';
    if (question.includes('home') || question.includes('property')) return 'properties';
    
    // Try to detect from data structure
    if (data.length > 0) {
      const firstItem = data[0];
      if (firstItem.projectCode || firstItem.name) return 'projects';
      if (firstItem.status && firstItem.assignedTo) return 'tasks';
    }
    
    return 'general';
  }

  private generateCountResponse(question: string, data: any[], database: string): string {
    const count = data.length;
    
    if (question.includes('project')) {
      if (count === 0) {
        return "📊 **No projects found** in the system.";
      } else if (count === 1) {
        return `📊 **We have 1 project** in the ${database} database.`;
      } else {
        return `📊 **We have ${count} projects** in the ${database} database.`;
      }
    }
    
    if (question.includes('task')) {
      return `📋 **We have ${count} tasks** in the system.`;
    }
    
    if (question.includes('user') || question.includes('staff')) {
      return `👥 **We have ${count} users** in the system.`;
    }
    
    return `🔢 **Found ${count} records** matching your query in ${database}.`;
  }

  private generateListResponse(question: string, data: any[], database: string): string {
    const count = data.length;
    
    if (count === 0) {
      return `📝 **No items found** matching your criteria in ${database}.`;
    }
    
    let response = `📝 **Found ${count} items** in ${database}:\n\n`;
    
    // Show first few items with key details
    const itemsToShow = Math.min(5, count);
    for (let i = 0; i < itemsToShow; i++) {
      const item = data[i];
      response += this.formatListItem(item, i + 1);
    }
    
    if (count > 5) {
      response += `\n...and ${count - 5} more items.`;
    }
    
    return response;
  }

  private generateStatusResponse(question: string, data: any[], database: string): string {
    const statusCounts = this.analyzeStatuses(data);
    const total = data.length;
    
    if (total === 0) {
      return "📊 **No items found** to analyze status.";
    }
    
    let response = `📊 **Status Analysis** (${total} total items from ${database}):\n\n`;
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const emoji = this.getStatusEmoji(status);
      response += `${emoji} **${status}**: ${count} items (${percentage}%)\n`;
    });
    
    return response;
  }

  private generateAnalyticsResponse(question: string, data: any[], database: string): string {
    const analytics = this.calculateBasicAnalytics(data);
    
    return `📈 **Analytics Summary** from ${database}:\n\n` +
           `🔢 **Total Records**: ${analytics.total}\n` +
           `📊 **Data Types**: ${analytics.dataTypes.join(', ')}\n` +
           `⏱️ **Analysis Time**: ${new Date().toLocaleString()}\n\n` +
           `**Key Insights**:\n${analytics.insights.map((i: string) => `• ${i}`).join('\n')}`;
  }

  private generateGenericResponse(question: string, data: any[], database: string): string {
    const count = data.length;
    
    return `🔍 **Query Results** from ${database}:\n\n` +
           `Found **${count} records** matching your query "${question}".\n\n` +
           (count > 0 ? 
             `**Sample Data**: ${this.formatSampleData(data[0])}` : 
             '**No data found** matching your criteria.');
  }

  private generateCountInsights(data: any[]): string[] {
    if (data.length === 0) return ['No data available for analysis'];
    
    const insights: string[] = [];
    
    // Analyze project statuses if it's project data
    const statusCounts = this.analyzeStatuses(data);
    if (Object.keys(statusCounts).length > 1) {
      const mostCommon = Object.entries(statusCounts)
        .sort(([,a], [,b]) => b - a)[0];
      insights.push(`Most common status: ${mostCommon[0]} (${mostCommon[1]} items)`);
    }
    
    // Check for recent activity
    const recentItems = this.analyzeRecency(data);
    if (recentItems > 0) {
      insights.push(`${recentItems} items were created/updated recently`);
    }
    
    return insights.length > 0 ? insights : ['Data successfully retrieved and counted'];
  }

  private generateListInsights(data: any[]): string[] {
    if (data.length === 0) return ['No items to analyze'];
    
    const insights: string[] = [];
    
    // Analyze diversity
    const uniqueFields = this.analyzeFieldDiversity(data);
    if (uniqueFields.length > 0) {
      insights.push(`Data contains: ${uniqueFields.slice(0, 3).join(', ')}`);
    }
    
    // Check completeness
    const completeness = this.analyzeDataCompleteness(data);
    if (completeness < 100) {
      insights.push(`Data completeness: ${completeness.toFixed(1)}%`);
    }
    
    return insights;
  }

  private generateStatusInsights(data: any[]): string[] {
    const insights: string[] = [];
    const statusCounts = this.analyzeStatuses(data);
    
    // Find dominant status
    const entries = Object.entries(statusCounts);
    if (entries.length > 0) {
      const total = data.length;
      const dominant = entries.sort(([,a], [,b]) => b - a)[0];
      const percentage = ((dominant[1] / total) * 100).toFixed(1);
      
      if (parseInt(percentage) > 50) {
        insights.push(`${dominant[0]} is the dominant status (${percentage}% of items)`);
      }
    }
    
    return insights;
  }

  private generateAnalyticsInsights(data: any[]): string[] {
    const insights: string[] = [];
    
    if (data.length > 0) {
      insights.push(`Dataset contains ${data.length} records`);
      
      const fields = Object.keys(data[0]);
      insights.push(`${fields.length} data fields per record`);
      
      // Check for common patterns
      const hasTimestamps = fields.some(f => 
        f.includes('date') || f.includes('created') || f.includes('updated')
      );
      if (hasTimestamps) {
        insights.push('Time-series data detected');
      }
    }
    
    return insights;
  }

  private generateGenericInsights(data: any[]): string[] {
    if (data.length === 0) return ['No data available'];
    
    return [
      `Retrieved ${data.length} records`,
      'Data structure analysis complete',
      'Results ready for further processing'
    ];
  }

  // Helper methods
  private formatListItem(item: any, index: number): string {
    const name = item.name || item.title || item.id || `Item ${index}`;
    const status = item.status ? ` (${item.status})` : '';
    return `${index}. **${name}**${status}\n`;
  }

  private analyzeStatuses(data: any[]): Record<string, number> {
    const statusCounts: Record<string, number> = {};
    
    data.forEach(item => {
      const status = item.status || item.currentPhase || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return statusCounts;
  }

  private getStatusEmoji(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('complete') || statusLower.includes('done')) return '✅';
    if (statusLower.includes('progress') || statusLower.includes('active')) return '🔄';
    if (statusLower.includes('planning') || statusLower.includes('pending')) return '📋';
    if (statusLower.includes('error') || statusLower.includes('failed')) return '❌';
    return '📊';
  }

  private calculateBasicAnalytics(data: any[]): any {
    return {
      total: data.length,
      dataTypes: data.length > 0 ? Object.keys(data[0]).slice(0, 5) : [],
      insights: [
        `Records analyzed: ${data.length}`,
        `Data fields per record: ${data.length > 0 ? Object.keys(data[0]).length : 0}`,
        'Analysis completed successfully'
      ]
    };
  }

  private analyzeRecency(data: any[]): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return data.filter(item => {
      const created = this.extractDate(item.createdAt || item.created || item.updatedAt);
      return created && created > weekAgo;
    }).length;
  }

  private analyzeFieldDiversity(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const fields = Object.keys(data[0]);
    return fields.filter(field => 
      !field.includes('id') && 
      !field.includes('createdAt') && 
      !field.includes('updatedAt')
    ).slice(0, 5);
  }

  private analyzeDataCompleteness(data: any[]): number {
    if (data.length === 0) return 0;
    
    const fields = Object.keys(data[0]);
    let totalFields = 0;
    let filledFields = 0;
    
    data.forEach(item => {
      fields.forEach(field => {
        totalFields++;
        if (item[field] !== null && item[field] !== undefined && item[field] !== '') {
          filledFields++;
        }
      });
    });
    
    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  }

  private extractDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    if (dateValue.seconds) {
      // Firestore Timestamp
      return new Date(dateValue.seconds * 1000);
    }
    
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    return null;
  }

  private formatSampleData(item: any): string {
    const keys = Object.keys(item).slice(0, 3);
    const sample = keys.map(key => `${key}: ${item[key]}`).join(', ');
    return sample.length > 100 ? sample.substring(0, 100) + '...' : sample;
  }
}
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
  queryInsights?: any; // Will be populated with detailed tracking
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
        
        // Add query insights if available
        if (queryResults?.queryInsights) {
          analysis.queryInsights = queryResults.queryInsights;
        }
        
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

  detectIntent(question: string): string {
    const q = question.toLowerCase();
    
    // Count queries
    if (q.includes('how many') || q.includes('count') || q.includes('total number')) {
      return 'count';
    }
    
    // List queries - enhanced detection
    if (q.includes('list') || q.includes('show me') || q.includes('what are') || 
        q.includes('tell me about') || q.includes('what') || q.includes('which') ||
        q.includes('give me') || q.includes('display') || q.includes('what can')) {
      return 'list';
    }
    
    // Status queries
    if (q.includes('status') || q.includes('progress') || q.includes('state') ||
        q.includes('how is') || q.includes('where is')) {
      return 'status';
    }
    
    // Analytics queries
    if (q.includes('analytics') || q.includes('metrics') || q.includes('performance') ||
        q.includes('statistics') || q.includes('summary') || q.includes('report')) {
      return 'analytics';
    }
    
    // Default to list if asking about specific entities
    if (q.includes('project') || q.includes('task') || q.includes('user')) {
      return 'list';
    }
    
    return 'general';
  }

  detectDataType(question: string, data: any[]): string {
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

  // Enhanced field mappings for intelligent display
  private getFieldMappings(): Record<string, Record<string, string>> {
    return {
      projects: {
        name: 'Project Name',
        projectCode: 'Code',
        status: 'Status',
        location: 'Location',
        clientName: 'Client',
        projectManagerName: 'Project Manager',
        overallProgress: 'Progress',
        currentPhaseName: 'Current Phase',
        projectType: 'Type',
        budget: 'Budget',
        startDate: 'Start Date',
        expectedEndDate: 'Expected End'
      },
      tasks: {
        name: 'Task Name',
        status: 'Status',
        assigneeName: 'Assigned To',
        priority: 'Priority',
        dueDate: 'Due Date',
        completedDate: 'Completed',
        estimatedHours: 'Est. Hours',
        actualHours: 'Actual Hours'
      },
      users: {
        displayName: 'Name',
        email: 'Email',
        role: 'Role',
        department: 'Department',
        status: 'Status'
      }
    };
  }

  private formatFieldValue(key: string, value: any): string {
    // Handle null/undefined
    if (value === null || value === undefined) return 'N/A';
    
    // Format timestamps
    if (key.includes('Date') || key.includes('At')) {
      if (value.seconds) {
        return new Date(value.seconds * 1000).toLocaleDateString();
      }
      return new Date(value).toLocaleDateString();
    }
    
    // Format currency
    if (key === 'budget' || key === 'budgetUsed' || key === 'actualCost') {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR'
      }).format(value);
    }
    
    // Format percentages
    if (key.includes('Progress') || key.includes('percentage')) {
      return `${value}%`;
    }
    
    // Format enums to readable text
    if (typeof value === 'string') {
      // Convert snake_case or UPPER_CASE to Title Case
      return value.replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    return String(value);
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
    const dataType = this.detectDataType(question, data);
    
    if (count === 0) {
      return `📝 **No ${dataType} found** in the system.`;
    }
    
    // For projects, provide a comprehensive overview
    if (dataType === 'projects') {
      let response = `📊 **FibreFlow Projects Overview**\n\n`;
      response += `We currently have **${count} project${count !== 1 ? 's' : ''}** in the system:\n\n`;
      
      const fieldMappings = this.getFieldMappings()['projects'];
      
      data.forEach((project, index) => {
        response += `**${index + 1}. ${project.name || 'Unnamed Project'}** (${project.projectCode || 'No Code'})\n`;
        response += `   📍 Location: ${project.location || 'Not specified'}\n`;
        response += `   👤 Client: ${project.clientName || 'Not assigned'}\n`;
        response += `   📊 Status: ${this.formatFieldValue('status', project.status)}\n`;
        response += `   📈 Progress: ${this.formatFieldValue('overallProgress', project.overallProgress || 0)}\n`;
        response += `   🎯 Current Phase: ${project.currentPhaseName || this.formatFieldValue('currentPhase', project.currentPhase) || 'Planning'}\n`;
        response += `   💰 Budget: ${this.formatFieldValue('budget', project.budget)}\n`;
        response += `   📅 Timeline: ${this.formatFieldValue('startDate', project.startDate)} → ${this.formatFieldValue('expectedEndDate', project.expectedEndDate)}\n`;
        response += `   👨‍💼 Project Manager: ${project.projectManagerName || 'Not assigned'}\n\n`;
      });
      
      // Add summary statistics
      const activeProjects = data.filter(p => p.status === 'active').length;
      const completedProjects = data.filter(p => p.status === 'completed').length;
      const totalBudget = data.reduce((sum, p) => sum + (p.budget || 0), 0);
      const avgProgress = data.reduce((sum, p) => sum + (p.overallProgress || 0), 0) / count;
      
      response += `---\n**Summary Statistics:**\n`;
      response += `• Active Projects: ${activeProjects}\n`;
      response += `• Completed Projects: ${completedProjects}\n`;
      response += `• Total Budget: ${this.formatFieldValue('budget', totalBudget)}\n`;
      response += `• Average Progress: ${avgProgress.toFixed(1)}%\n`;
      
      return response;
    }
    
    // Generic list response for other data types
    let response = `📝 **Found ${count} ${dataType}** in ${database}:\n\n`;
    
    const allMappings = this.getFieldMappings();
    const fieldMappings = allMappings[dataType as keyof typeof allMappings] || {};
    const itemsToShow = Math.min(10, count);
    
    for (let i = 0; i < itemsToShow; i++) {
      const item = data[i];
      response += this.formatDetailedItem(item, i + 1, fieldMappings);
    }
    
    if (count > 10) {
      response += `\n...and ${count - 10} more items.`;
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
    const dataType = this.detectDataType(question, data);
    
    // If we have a known data type, use the list response
    if (dataType !== 'general') {
      return this.generateListResponse(question, data, database);
    }
    
    // For truly generic queries, provide a better formatted response
    if (count === 0) {
      return `🔍 **No results found** for your query.`;
    }
    
    let response = `🔍 **Query Results** from ${database}:\n\n`;
    response += `Found **${count} records** matching your query.\n\n`;
    
    // Show the first few records with better formatting
    const itemsToShow = Math.min(3, count);
    for (let i = 0; i < itemsToShow; i++) {
      const item = data[i];
      response += `**Record ${i + 1}:**\n`;
      
      // Show only the most important fields
      const importantFields = this.extractImportantFields(item);
      importantFields.forEach(([key, value]) => {
        response += `• ${this.humanizeFieldName(key)}: ${this.formatFieldValue(key, value)}\n`;
      });
      response += '\n';
    }
    
    if (count > 3) {
      response += `...and ${count - 3} more records.\n`;
    }
    
    return response;
  }

  private formatDetailedItem(item: any, index: number, fieldMappings: Record<string, string>): string {
    let response = `**${index}. ${item.name || item.title || `Item ${index}`}**\n`;
    
    // Use field mappings to show only relevant fields
    Object.entries(fieldMappings).forEach(([key, label]) => {
      if (item[key] !== undefined && item[key] !== null && key !== 'name') {
        response += `   ${label}: ${this.formatFieldValue(key, item[key])}\n`;
      }
    });
    
    response += '\n';
    return response;
  }

  private extractImportantFields(item: any): Array<[string, any]> {
    // Define priority fields to show
    const priorityFields = ['name', 'title', 'status', 'type', 'location', 'date', 'createdAt'];
    const fields: Array<[string, any]> = [];
    
    // First, add priority fields if they exist
    priorityFields.forEach(field => {
      if (item[field] !== undefined && item[field] !== null) {
        fields.push([field, item[field]]);
      }
    });
    
    // If we don't have enough fields, add some more
    if (fields.length < 5) {
      Object.entries(item).forEach(([key, value]) => {
        if (!priorityFields.includes(key) && 
            !key.includes('id') && 
            !key.includes('Id') &&
            fields.length < 5) {
          fields.push([key, value]);
        }
      });
    }
    
    return fields.slice(0, 5);
  }

  private humanizeFieldName(fieldName: string): string {
    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
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
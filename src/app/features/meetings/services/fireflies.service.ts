import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { inject } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface FirefliesConfig {
  apiKey: string;
  apiUrl: string;
}

export interface FirefliesMeeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: FirefliesParticipant[];
  transcript_url: string;
  summary: string;
  action_items: FirefliesActionItem[];
  video_url?: string;
  audio_url?: string;
}

export interface FirefliesParticipant {
  name: string;
  email: string;
}

export interface FirefliesActionItem {
  text: string;
  assignee?: string;
  due_date?: string;
  speaker?: string;
  timestamp?: number;
}

export interface FirefliesTranscript {
  meeting_id: string;
  sentences: FirefliesSentence[];
  summary: string;
  keywords: string[];
  action_items: FirefliesActionItem[];
}

export interface FirefliesSentence {
  text: string;
  speaker_name: string;
  speaker_email: string;
  start_time: number;
  end_time: number;
}

@Injectable({
  providedIn: 'root',
})
export class FirefliesService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api.fireflies.ai/graphql';
  private apiKey = environment.fireflies?.apiKey || '';

  // Direct API call to Fireflies
  getMeetings(dateFrom?: Date, dateTo?: Date): Observable<FirefliesMeeting[]> {
    console.log('Making direct API call to Fireflies with dates:', { dateFrom, dateTo });
    
    const query = this.buildMeetingsQuery(dateFrom, dateTo);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });

    return this.http.post<any>(this.apiUrl, { query }, { headers }).pipe(
      map((response) => {
        console.log('Fireflies API response:', response);
        if (response.errors) {
          console.error('GraphQL errors:', response.errors);
          return [];
        }
        return response.data?.meetings || [];
      }),
      catchError((error) => {
        console.error('Error fetching Fireflies meetings:', error);
        return of([]);
      })
    );
  }

  // Get specific meeting transcript via direct API
  getMeetingTranscript(meetingId: string): Observable<FirefliesTranscript> {
    const query = this.buildTranscriptQuery(meetingId);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });

    return this.http.post<any>(this.apiUrl, { query }, { headers }).pipe(
      map((response) => response.data?.transcript || null),
      catchError((error) => {
        console.error('Error fetching transcript:', error);
        throw error;
      })
    );
  }

  // GraphQL query builders
  private buildMeetingsQuery(dateFrom?: Date, dateTo?: Date): string {
    const dateFilter =
      dateFrom && dateTo
        ? `date_from: "${dateFrom.toISOString()}", date_to: "${dateTo.toISOString()}"`
        : '';

    return `
      query GetMeetings {
        meetings(${dateFilter}) {
          id
          title
          date
          duration
          participants {
            name
            email
          }
          transcript_url
          summary
          action_items {
            text
            assignee
            due_date
            speaker
            timestamp
          }
          video_url
          audio_url
        }
      }
    `;
  }

  private buildTranscriptQuery(meetingId: string): string {
    return `
      query GetTranscript {
        transcript(id: "${meetingId}") {
          meeting_id
          sentences {
            text
            speaker_name
            speaker_email
            start_time
            end_time
          }
          summary
          keywords
          action_items {
            text
            assignee
            due_date
            speaker
            timestamp
          }
        }
      }
    `;
  }

  // Process action items to extract insights
  processActionItems(actionItems: FirefliesActionItem[]): any[] {
    return actionItems.map((item) => {
      const priority = this.extractPriority(item.text);
      const type = this.extractActionType(item.text);

      return {
        ...item,
        priority,
        type,
        context: this.extractContext(item.text),
      };
    });
  }

  private extractPriority(text: string): 'high' | 'medium' | 'low' {
    const lowercaseText = text.toLowerCase();
    if (
      lowercaseText.includes('urgent') ||
      lowercaseText.includes('asap') ||
      lowercaseText.includes('critical') ||
      lowercaseText.includes('immediately')
    ) {
      return 'high';
    }
    if (lowercaseText.includes('important') || lowercaseText.includes('priority')) {
      return 'medium';
    }
    return 'low';
  }

  private extractActionType(text: string): string {
    const lowercaseText = text.toLowerCase();
    if (lowercaseText.includes('email') || lowercaseText.includes('send')) return 'communication';
    if (lowercaseText.includes('review') || lowercaseText.includes('check')) return 'review';
    if (lowercaseText.includes('create') || lowercaseText.includes('build')) return 'creation';
    if (lowercaseText.includes('fix') || lowercaseText.includes('resolve')) return 'fix';
    if (lowercaseText.includes('meet') || lowercaseText.includes('schedule')) return 'meeting';
    return 'task';
  }

  private extractContext(text: string): string {
    // Extract the first 100 characters as context
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  // Convert Fireflies meeting to our Meeting model
  convertToMeeting(firefliesMeeting: FirefliesMeeting): any {
    return {
      firefliesToId: firefliesMeeting.id,
      title: firefliesMeeting.title,
      date: new Date(firefliesMeeting.date),
      duration: firefliesMeeting.duration,
      participants: firefliesMeeting.participants.map((p) => ({
        email: p.email,
        name: p.name,
        isSpeaker: true,
      })),
      summary: firefliesMeeting.summary,
      actionItems: this.processActionItems(firefliesMeeting.action_items).map((item, index) => ({
        id: `${firefliesMeeting.id}_action_${index}`,
        text: item.text,
        assigneeEmail: item.assignee,
        dueDate: item.due_date ? new Date(item.due_date) : undefined,
        priority: item.priority,
        completed: false,
        speakerName: item.speaker,
        timestamp: item.timestamp,
        context: item.context,
      })),
      insights: [], // Will be populated by AI processing
      transcriptUrl: firefliesMeeting.transcript_url,
      status: 'pending',
    };
  }
}

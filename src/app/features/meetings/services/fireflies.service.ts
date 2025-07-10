import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, map, catchError, of } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { inject } from '@angular/core';

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
  private functions = inject(Functions);

  constructor() {
    console.log('FirefliesService initialized');
    console.log('Functions instance available:', !!this.functions);
  }

  // Alternative HTTP sync method (bypasses CORS issues)
  syncMeetingsViaHttp(daysBack: number = 7): Observable<any> {
    // Use the tempSyncMeetings function which has proper CORS headers and is deployed
    const functionUrl = `https://us-central1-fibreflow-73daf.cloudfunctions.net/tempSyncMeetings?days=${daysBack}`;

    return this.http.get(functionUrl).pipe(
      map((response: any) => {
        console.log('HTTP sync response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Error in HTTP sync:', error);
        return of({
          success: false,
          error: error.message || 'Failed to sync meetings',
          stats: { totalMeetings: 0 },
        });
      }),
    );
  }

  // GraphQL endpoint
  private apiUrl = 'https://api.fireflies.ai/graphql';

  // Call Firebase Function to get meetings (keeps API key secure)
  getMeetings(dateFrom?: Date, dateTo?: Date): Observable<FirefliesMeeting[]> {
    const getMeetingsFunction = httpsCallable(this.functions, 'getFirefliesMeetings');
    return from(getMeetingsFunction({ dateFrom, dateTo })).pipe(
      map((result: any) => result.data.meetings),
      catchError((error) => {
        console.error('Error fetching Fireflies meetings:', error);
        return of([]);
      }),
    );
  }

  // Manual sync meetings from Fireflies
  syncMeetings(daysBack: number = 7): Observable<any> {
    console.log('FirefliesService: Starting sync with daysBack:', daysBack);
    console.log('Functions instance:', this.functions);

    // Use the new callable function that doesn't have IAM issues
    const syncFunction = httpsCallable(this.functions, 'syncFirefliesMeetingsManually');
    console.log('Callable function created:', syncFunction);

    return from(syncFunction({ days: daysBack })).pipe(
      map((result: any) => {
        console.log('Sync function result:', result);
        return result.data;
      }),
      catchError((error) => {
        console.error('Error syncing meetings - Full error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        return of({
          success: false,
          error: error.message || 'Failed to sync meetings',
          errorCode: error.code,
          stats: { totalMeetings: 0 },
        });
      }),
    );
  }

  // Get specific meeting transcript
  getMeetingTranscript(meetingId: string): Observable<FirefliesTranscript> {
    const getTranscriptFunction = httpsCallable(this.functions, 'getFirefliesTranscript');
    return from(getTranscriptFunction({ meetingId })).pipe(
      map((result: any) => result.data),
      catchError((error) => {
        console.error('Error fetching transcript:', error);
        throw error;
      }),
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

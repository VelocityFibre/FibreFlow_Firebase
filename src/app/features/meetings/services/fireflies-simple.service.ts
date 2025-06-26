import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { FirefliesMeeting } from './fireflies.service';

@Injectable({
  providedIn: 'root',
})
export class FirefliesSimpleService {
  
  // Return mock meetings for testing
  getMeetings(dateFrom?: Date, dateTo?: Date): Observable<FirefliesMeeting[]> {
    console.log('Returning mock meetings for dates:', { dateFrom, dateTo });
    
    const mockMeetings: FirefliesMeeting[] = [
      {
        id: 'mock-1',
        title: 'TARGET 2500 - VF Daily Check in',
        date: new Date().toISOString(),
        duration: 30,
        participants: [
          { name: 'John Doe', email: 'john@velocityfibre.co.za' },
          { name: 'Jane Smith', email: 'jane@velocityfibre.co.za' }
        ],
        transcript_url: 'https://fireflies.ai/transcript/mock-1',
        summary: 'Daily standup meeting discussing project progress and blockers.',
        action_items: [
          {
            text: 'Complete fiber installation at Site A by Friday',
            assignee: 'john@velocityfibre.co.za',
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            speaker: 'John Doe',
            timestamp: 300
          },
          {
            text: 'Review contractor invoices for approval',
            assignee: 'jane@velocityfibre.co.za',
            due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            speaker: 'Jane Smith',
            timestamp: 600
          }
        ],
        video_url: '',
        audio_url: ''
      },
      {
        id: 'mock-2',
        title: 'Velocity Directors Meeting',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        participants: [
          { name: 'Director One', email: 'director1@velocityfibre.co.za' },
          { name: 'Director Two', email: 'director2@velocityfibre.co.za' }
        ],
        transcript_url: 'https://fireflies.ai/transcript/mock-2',
        summary: 'Board meeting discussing Q4 targets and expansion plans.',
        action_items: [
          {
            text: 'Prepare Q4 financial report',
            assignee: 'cfo@velocityfibre.co.za',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            speaker: 'Director One',
            timestamp: 1200
          }
        ],
        video_url: '',
        audio_url: ''
      },
      {
        id: 'mock-3',
        title: 'Velocity OPS Manco',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 45,
        participants: [
          { name: 'Ops Manager', email: 'ops@velocityfibre.co.za' },
          { name: 'Field Team Lead', email: 'field@velocityfibre.co.za' }
        ],
        transcript_url: 'https://fireflies.ai/transcript/mock-3',
        summary: 'Operations management meeting covering field activities and resource allocation.',
        action_items: [
          {
            text: 'Schedule maintenance for network equipment',
            assignee: 'field@velocityfibre.co.za',
            due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            speaker: 'Ops Manager',
            timestamp: 900
          },
          {
            text: 'Update inventory tracking system',
            assignee: 'ops@velocityfibre.co.za',
            due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            speaker: 'Field Team Lead',
            timestamp: 1500
          }
        ],
        video_url: '',
        audio_url: ''
      }
    ];
    
    return of(mockMeetings);
  }
}
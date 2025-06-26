export interface Meeting {
  id: string;
  firefliesId?: string;
  title: string;
  dateTime: string;
  duration: number;
  organizer?: string;
  participants: MeetingParticipant[];
  summary?: string;
  actionItems?: ActionItem[];
  insights?: MeetingInsights;
  meetingUrl?: string;
  recordingUrl?: string;
  transcript?: string;
  transcriptStorageUrl?: string;
  vectorEmbeddingId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  status?: MeetingStatus;
}

export interface MeetingParticipant {
  email: string;
  name: string;
  isSpeaker?: boolean;
  speakingDuration?: number;
}

export interface ActionItem {
  id?: string;
  text: string;
  assignee?: string;
  assigneeEmail?: string;
  assigneeName?: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completedAt?: string;
  convertedToTaskId?: string;
  convertedToPersonalTodoId?: string;
  context?: string;
  speakerName?: string;
  timestamp?: number;
}

export interface Insight {
  id: string;
  type: InsightType;
  content: string;
  confidence: number;
  relatedActionItems?: string[];
  timestamp?: number;
}

export enum InsightType {
  DECISION = 'decision',
  RISK = 'risk',
  DEADLINE = 'deadline',
  COMMITMENT = 'commitment',
  QUESTION = 'question',
  CONCERN = 'concern',
  OPPORTUNITY = 'opportunity',
}

export enum MeetingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

export interface MeetingSearchQuery {
  query: string;
  dateFrom?: Date;
  dateTo?: Date;
  participants?: string[];
  projectId?: string;
  hasActionItems?: boolean;
  insightTypes?: InsightType[];
}

export interface MeetingTranscript {
  meetingId: string;
  segments: TranscriptSegment[];
  fullText?: string;
  keywords: string[];
  topics: string[];
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: number;
  duration: number;
}

export interface MeetingInsights {
  keyTopics?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  speakerStats?: {
    [name: string]: {
      duration: number;
      percentage: number;
    };
  };
  insights?: Insight[];
}

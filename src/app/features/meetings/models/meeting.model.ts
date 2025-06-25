export interface Meeting {
  id?: string;
  firefliesToId: string;
  title: string;
  date: Date;
  duration: number;
  participants: MeetingParticipant[];
  summary: string;
  actionItems: ActionItem[];
  insights: Insight[];
  transcriptUrl?: string;
  transcriptStorageUrl?: string;
  vectorEmbeddingId?: string;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  status: MeetingStatus;
}

export interface MeetingParticipant {
  email: string;
  name: string;
  isSpeaker: boolean;
  speakingDuration?: number;
}

export interface ActionItem {
  id: string;
  text: string;
  assigneeEmail?: string;
  assigneeName?: string;
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completedAt?: Date;
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
  OPPORTUNITY = 'opportunity'
}

export enum MeetingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed'
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
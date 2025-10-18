/**
 * Types for AI Assistant Service
 */

export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (params: any, userId: number) => Promise<any>;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'function';
  parts: Array<{
    text?: string;
    functionCall?: any;
    functionResponse?: any;
  }>;
}

export interface ChatRequest {
  message: string;
  userId: number;
  sessionId?: string;
  conversationHistory?: ChatMessage[];
  userContext?: UserContext;
}

export interface ChatResponse {
  response: string;
  toolsUsed?: string[];
  conversationHistory: ChatMessage[];
  sessionId?: string;
  userContext?: UserContext;
}

export interface AvailablePlace {
  id: number;
  name: string;
  city: string;
  capacity: number | null;
  type: string | null;
  summary: string;
  internalNotes?: {
    includeCapacity: boolean;
    direction?: string | null;
  };
}

export interface PlaceReview {
  reviewer: {
    id: number;
    name: string | null;
    lastName: string | null;
  };
  rating: number;
  comment: string | null;
  createdAt: string;
  tone: 'positive' | 'neutral' | 'negative';
}

export interface CreateEventParams {
  placeId: number;
  eventName: string;
  description?: string;
  date: string;
  minAge?: number;
  communityId?: number;
  visibility?: 'PUBLIC' | 'PRIVATE';
}

export interface EventCreationResult {
  success: boolean;
  event?: {
    id: number;
    name: string;
    place: {
      name: string;
      city: string;
    };
    timeBegin: Date;
    timeEnd?: Date | null;
  };
  message: string;
  reason?: string;
  details?: any;
  localTimeDescription?: string;
  localEndDescription?: string | null;
}

export interface EventAssistantContext {
  user: UserContext;
}

export interface UserContext {
  id: number;
  role: string;
  membership?: string | null;
  name?: string | null;
  lastName?: string | null;
  lastEventDate?: Date | null;
  lastPlaceName?: string | null;
}

export interface UpcomingEvent {
  id: number;
  name: string;
  timeBegin: string;
  timeEnd?: string | null;
  status: string;
  localTimeDescription: string;
  localEndDescription?: string | null;
  place: {
    id: number;
    name: string;
    city: string | null;
    summary: string;
  };
  ticketInfo?: {
    requiresPurchase: boolean;
    lowestPrice?: string;
  };
  recentReviews?: Array<{
    reviewerName: string | null;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
}

export interface EventUpdateResult {
  success: boolean;
  message: string;
  event?: {
    id: number;
    name: string;
    timeBegin: string;
    timeEnd?: string | null;
    localTimeDescription: string;
    localEndDescription?: string | null;
    description?: string | null;
    place: {
      id: number;
      name: string;
      city: string | null;
    };
  };
  reason?: string;
  details?: any;
}

export interface JoinEventResult {
  success: boolean;
  message: string;
  reason?: string;
  alreadyJoined?: boolean;
  attendance?: {
    eventId: number;
    userId: number;
    joinedAt: string;
    eventName?: string;
    localTimeDescription?: string | null;
  };
  details?: any;
}

export interface CommunityEventSummary {
  id: number;
  name: string;
  description?: string | null;
  timeBegin: string;
  timeEnd?: string | null;
  localTimeDescription: string;
  localEndDescription?: string | null;
  status: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  place?: {
    id: number;
    name: string;
    city?: string | null;
    country?: string | null;
    image?: string | null;
  } | null;
  organizer?: {
    id: number;
    name: string | null;
    lastName: string | null;
    image?: string | null;
  } | null;
  attendeeCount: number;
  ticketInfo?: {
    requiresPurchase: boolean;
    lowestPrice?: string;
  };
  recentReviews?: Array<{
    reviewerName: string | null;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
}

export interface CommunityEventsResult {
  success: boolean;
  events: CommunityEventSummary[];
  message?: string;
  reason?: string;
  details?: any;
}

export interface JoinedEventSummary {
  id: number;
  name: string;
  timeBegin: string;
  timeEnd?: string | null;
  localTimeDescription: string;
  localEndDescription?: string | null;
  status: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  place?: {
    id: number;
    name: string;
    city?: string | null;
    country?: string | null;
  } | null;
  community?: {
    id: number;
    name: string | null;
  } | null;
  organizer?: {
    id: number;
    name: string | null;
    lastName: string | null;
  } | null;
  ticketInfo?: {
    requiresPurchase: boolean;
    lowestPrice?: string;
  };
  recentReviews?: Array<{
    reviewerName: string | null;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
}

export interface JoinedEventsResult {
  success: boolean;
  events: JoinedEventSummary[];
  message?: string;
  reason?: string;
  details?: any;
}

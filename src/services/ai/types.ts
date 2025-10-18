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
}

export interface CreateEventParams {
  placeId: number;
  eventName: string;
  description?: string;
  date: string;
  minAge?: number;
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
  };
  message: string;
  reason?: string;
  details?: any;
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

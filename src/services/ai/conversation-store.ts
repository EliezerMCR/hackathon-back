import { ChatMessage, UserContext } from './types';

/**
 * Simple in-memory conversation store shared between HTTP and MCP entrypoints.
 * For production you might want to replace this with Redis or another persistent store.
 */
class ConversationStore {
  private sessions = new Map<string, ChatMessage[]>();
  private contexts = new Map<string, UserContext>();

  get(sessionId: string): ChatMessage[] | undefined {
    return this.sessions.get(sessionId);
  }

  set(sessionId: string, history: ChatMessage[]): void {
    this.sessions.set(sessionId, history);
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.contexts.delete(sessionId);
  }

  setContext(sessionId: string, context: UserContext): void {
    this.contexts.set(sessionId, context);
  }

  getContext(sessionId: string): UserContext | undefined {
    return this.contexts.get(sessionId);
  }
}

export const aiConversationStore = new ConversationStore();

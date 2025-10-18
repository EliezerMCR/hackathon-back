/**
 * AI Assistant Routes
 * Endpoints for interacting with the AI assistant powered by Gemini
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth';
import { AIAssistantService } from '../services/ai/assistant.service';
import { aiConversationStore } from '../services/ai/conversation-store';

const router = Router();

// Helper function to get AI service instance (lazy initialization)
const getAIService = () => new AIAssistantService();

// ==================== VALIDATION SCHEMAS ====================

const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().max(100).optional(),
  resetConversation: z.boolean().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model', 'function']),
    parts: z.array(z.object({
      text: z.string().optional(),
      functionCall: z.any().optional(),
      functionResponse: z.any().optional()
    }))
  })).optional()
});

// ==================== AI ASSISTANT ENDPOINTS ====================

/**
 * POST /api/ai/chat
 * Send a message to the AI assistant
 * The AI can use tools to interact with the API (create events, get places, etc.)
 */
router.post('/chat', authenticate, async (req: Request, res: Response) => {
  try {
    const validation = chatSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { message, conversationHistory, conversationId, resetConversation } = validation.data;

    const authUser = (req as any).user;
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const sessionId = conversationId ?? `user-${userId}`;

    if (resetConversation) {
      aiConversationStore.clear(sessionId);
    }

    const cachedContext = aiConversationStore.getContext(sessionId);

    // Process the chat message
    const aiService = getAIService();
    const response = await aiService.chat({
      message,
      userId,
      sessionId,
      conversationHistory,
      userContext: cachedContext
    });

    res.json({
      success: true,
      data: {
        ...response,
        conversationId: sessionId
      }
    });

  } catch (error: any) {
    console.error('Error in AI chat endpoint:', error);
    res.status(500).json({
      error: 'Failed to process AI request',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/tools
 * Get list of available AI tools/capabilities
 */
router.get('/tools', (_req: Request, res: Response) => {
  try {
    const aiService = getAIService();
    const tools = aiService.getAvailableTools();

    res.json({
      success: true,
      data: {
        tools,
        count: tools.length
      }
    });
  } catch (error: any) {
    console.error('Error getting AI tools:', error);
    res.status(500).json({
      error: 'Failed to get AI tools',
      message: error.message
    });
  }
});

/**
 * DELETE /api/ai/conversation
 * Clear conversation history for the current user
 * Optional: pass conversationId in query params to clear specific conversation
 */
router.delete('/conversation', authenticate, (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const conversationId = (req.query.conversationId as string) ?? `user-${userId}`;

    // Clear the conversation history
    aiConversationStore.clear(conversationId);

    res.json({
      success: true,
      message: 'Conversation history cleared successfully',
      conversationId
    });
  } catch (error: any) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({
      error: 'Failed to clear conversation',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/health
 * Check if AI service is configured correctly
 */
router.get('/health', (_req: Request, res: Response) => {
  try {
    const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

    res.json({
      success: true,
      configured: hasApiKey,
      message: hasApiKey
        ? 'AI service is ready'
        : 'GEMINI_API_KEY or GOOGLE_API_KEY not configured'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

export default router;

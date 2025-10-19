/**
 * AI Assistant Routes
 * Endpoints for interacting with the AI assistant powered by Gemini
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticate } from '../middlewares/auth';
import { AIAssistantService } from '../services/ai/assistant.service';
import { aiConversationStore } from '../services/ai/conversation-store';

const router = Router();

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size (2 min audio)
  },
  fileFilter: (_req, file, cb) => {
    // Accept common audio formats
    const allowedMimeTypes = [
      'audio/mpeg',      // MP3
      'audio/mp3',
      'audio/wav',       // WAV
      'audio/wave',
      'audio/x-wav',
      'audio/webm',      // WebM
      'audio/ogg',       // OGG
      'audio/mp4',       // M4A
      'audio/x-m4a',
      'audio/flac',      // FLAC
      'audio/aac',       // AAC
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato de audio no soportado: ${file.mimetype}`));
    }
  },
});

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
 * POST /api/ai/audio
 * Send an audio file to transcribe and process with AI assistant
 * The audio is transcribed to text and then processed like a regular chat message
 * 
 * Form data:
 * - audio: Audio file (MP3, WAV, WebM, OGG, M4A, FLAC, AAC)
 * - conversationId: (optional) Session ID for conversation continuity
 * - resetConversation: (optional) Reset conversation history
 */
router.post('/audio', authenticate, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: 'No audio file provided',
        message: 'Please upload an audio file in the "audio" field'
      });
    }

    // Get optional parameters from body
    const conversationId = req.body.conversationId;
    const resetConversation = req.body.resetConversation === 'true';

    const sessionId = conversationId ?? `user-${userId}`;

    if (resetConversation) {
      aiConversationStore.clear(sessionId);
    }

    const cachedContext = aiConversationStore.getContext(sessionId);

    // Process the audio
    const aiService = getAIService();
    const response = await aiService.transcribeAndChat({
      audioBuffer: file.buffer,
      mimeType: file.mimetype,
      userId,
      sessionId,
      userContext: cachedContext,
    });

    res.json({
      success: true,
      data: {
        transcription: response.transcription,
        response: response.response,
        toolsUsed: response.toolsUsed,
        conversationHistory: response.conversationHistory,
        conversationId: sessionId,
      }
    });

  } catch (error: any) {
    console.error('Error in AI audio endpoint:', error);
    res.status(500).json({
      error: 'Failed to process audio',
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

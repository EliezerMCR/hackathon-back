/**
 * AI Assistant Service
 * Orchestrates conversations between users and Gemini AI with tool calling.
 * Now enriches prompts with dynamic user context and shares state between HTTP and MCP.
 */
import { SchemaType } from '@google/generative-ai';
import { DateTime } from 'luxon';
import { prisma } from '../../lib/prisma';
import { GeminiClient } from './gemini-client';
import { availableTools } from './tools';
import { ChatRequest, ChatResponse, ChatMessage, UserContext } from './types';
import { aiConversationStore } from './conversation-store';
import { buildEventAssistantPrompt } from './prompts';

const MAX_TOOL_ITERATIONS = 5;
const EVENT_TIMEZONE = process.env.EVENT_TIMEZONE || 'America/Caracas';

const formatDateForPrompt = (date: Date | null | undefined) => {
  if (!date) {
    return null;
  }

  const formatted = DateTime.fromJSDate(date).setZone(EVENT_TIMEZONE);
  if (!formatted.isValid) {
    return null;
  }

  return `${formatted.toFormat('dd LLL yyyy, HH:mm')} (${EVENT_TIMEZONE})`;
};

const formatPromptContext = (context?: UserContext) => {
  if (!context) {
    return undefined;
  }

  return {
    role: context.role,
    membership: context.membership ?? undefined,
    preferredName:
      [context.name, context.lastName].filter(Boolean).join(' ') || context.name || context.lastName || undefined,
    lastEventDate: formatDateForPrompt(context.lastEventDate),
    lastPlaceName: context.lastPlaceName ?? null,
    defaultCity: context.city ?? null,
  };
};

export class AIAssistantService {
  private geminiClient: GeminiClient;

  constructor() {
    this.geminiClient = new GeminiClient();
  }

  private async loadUserContext(userId: number, sessionId?: string, incoming?: UserContext): Promise<UserContext> {
    if (incoming) {
      return incoming;
    }

    if (sessionId) {
      const cachedContext = aiConversationStore.getContext(sessionId);
      if (cachedContext) {
        return cachedContext;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizedEvents: {
          take: 1,
          orderBy: { timeBegin: 'desc' },
          include: {
            place: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      return {
        id: userId,
        role: 'CLIENT',
      };
    }

    const lastEvent = user.organizedEvents?.[0];

    return {
      id: user.id,
      role: user.role,
      membership: user.membership,
      name: user.name,
      lastName: user.lastName,
      lastEventDate: lastEvent?.timeBegin ?? null,
      lastPlaceName: lastEvent?.place?.name ?? null,
      city: user.city ?? null,
    };
  }

  /**
   * Main method to process a chat message with AI.
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const {
      message,
      userId,
      sessionId,
      conversationHistory: providedHistory,
      userContext: providedContext,
    } = request;

    const userContext = await this.loadUserContext(userId, sessionId, providedContext);

    const existingHistory =
      providedHistory ?? (sessionId ? aiConversationStore.get(sessionId) : undefined) ?? [];
    const historyForModel =
      existingHistory.length > 0 ? JSON.parse(JSON.stringify(existingHistory)) : [];

    try {
      const toolDeclarations = availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: tool.parameters.properties,
          required: tool.parameters.required || [],
        },
      }));

      const systemInstruction = {
        role: 'system',
        parts: [{ text: buildEventAssistantPrompt(formatPromptContext(userContext)) }],
      };

      const buildFallbackResponse = (lastToolCall: { name: string; response: any } | null): string | null => {
        if (!lastToolCall) {
          return null;
        }

        if (lastToolCall.name === 'get_available_places') {
          const data = lastToolCall.response?.data;
          if (Array.isArray(data) && data.length > 0) {
            const lines = data
              .slice(0, 5)
              .map((place: any, index: number) => {
                const city = place.city ? ` en ${place.city}` : '';
                const summary = place.summary ? ` - ${place.summary}` : '';
                return `${index + 1}. ${place.name}${city}${summary}`;
              });
            return ['Encontré estas opciones:', ...lines].join('\n');
          }
          if (Array.isArray(data) && data.length === 0) {
            return 'No pude encontrar lugares con los criterios actuales.';
          }
        }

        return null;
      };

      const model = this.geminiClient.getModel();
      const chat = model.startChat({
        history: historyForModel,
        tools: [{ functionDeclarations: toolDeclarations }],
        systemInstruction,
      });

      let currentMessage = message;
      const toolsUsed: string[] = [];
      let finalResponse = '';
      let iterations = 0;
      let lastToolCall: { name: string; response: any } | null = null;

      while (iterations < MAX_TOOL_ITERATIONS) {
        iterations += 1;

        const result = await chat.sendMessage(currentMessage);
        const response = result.response;
        const functionCalls = response.functionCalls();

        // Debug logging
        if (!functionCalls || functionCalls.length === 0) {
          const responseText = response.text();
          console.log('[AI Debug] No function calls detected. Response:', responseText.substring(0, 200));

          // Check if response contains code that looks like it should be a function call
          if (responseText.includes('get_available_places') ||
              responseText.includes('create_event') ||
              responseText.includes('print(') ||
              responseText.includes('default_api')) {
            console.error('[AI Error] Model returned code instead of function call!');
            console.error('Response:', responseText);
            finalResponse = 'Error interno: El asistente generó código en lugar de ejecutar las herramientas. Por favor intenta de nuevo.';
            break;
          }

          finalResponse = responseText;
          break;
        }

        const functionResponseParts = [];

        for (const functionCall of functionCalls) {
          console.log(`AI calling tool: ${functionCall.name}`, functionCall.args);
          toolsUsed.push(functionCall.name);

          const tool = availableTools.find(t => t.name === functionCall.name);

          let toolResult;
          if (!tool) {
            toolResult = {
              success: false,
              reason: 'TOOL_NOT_FOUND',
              message: `Tool ${functionCall.name} not found`,
            };
          } else {
            try {
              toolResult = await tool.handler(functionCall.args, userId);
            } catch (error: any) {
              console.error(`Error executing tool ${functionCall.name}:`, error);
              toolResult = {
                success: false,
                reason: 'HANDLER_ERROR',
                message: error.message || 'Error executing tool',
              };
            }
          }

          let responseObject;
          if (Array.isArray(toolResult)) {
            responseObject = { success: true, data: toolResult };
          } else if (typeof toolResult === 'object' && toolResult !== null) {
            responseObject = toolResult;
          } else {
            responseObject = { success: true, result: toolResult };
          }

          lastToolCall = {
            name: functionCall.name,
            response: responseObject,
          };

          functionResponseParts.push({
            functionResponse: {
              name: functionCall.name,
              response: responseObject,
            },
          });
        }

        const functionResponseResult = await chat.sendMessage(functionResponseParts);
        const nextFunctionCalls = functionResponseResult.response.functionCalls();

        if (!nextFunctionCalls || nextFunctionCalls.length === 0) {
          const responseText = functionResponseResult.response.text();
          console.log('[AI Debug] After tool execution, response:', responseText.substring(0, 200));

          if (!responseText || responseText.trim() === '') {
            console.error('[AI Error] Model returned empty response after tool execution');
            finalResponse =
              buildFallbackResponse(lastToolCall) ??
              'Lo siento, hubo un problema al procesar tu solicitud. Por favor intenta de nuevo.';
          } else {
            finalResponse = responseText;
          }
          break;
        }

        console.log('[AI Debug] Model wants to call more functions:', nextFunctionCalls.map((fc: any) => fc.name));
        currentMessage = '';
      }

      const history = (await chat.getHistory()) as ChatMessage[];

      if (sessionId) {
        aiConversationStore.set(sessionId, history);
        aiConversationStore.setContext(sessionId, userContext);
      }

      return {
        response: finalResponse || 'No pude generar una respuesta en este momento.',
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        conversationHistory: history,
        sessionId,
        userContext,
      };
    } catch (error: any) {
      console.error('Error in AI chat:', error);
      throw new Error(`AI Assistant error: ${error.message}`);
    }
  }

  /**
   * Get available tools info for documentation.
   */
  getAvailableTools() {
    return availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }
}

import readline from 'node:readline';
import process from 'node:process';
import jwt from 'jsonwebtoken';
import { AIAssistantService } from '../services/ai/assistant.service';
import { aiConversationStore } from '../services/ai/conversation-store';
import { availableTools } from '../services/ai/tools';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

const TOOL_DEFINITIONS = [
  {
    name: 'chat_with_event_assistant',
    description: 'Envía un mensaje al asistente de eventos (Gemini) y recibe una respuesta contextual.',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'JWT obtenido del backend (puede incluir el prefijo "Bearer ").',
        },
        message: {
          type: 'string',
          description: 'Mensaje del usuario para el asistente.',
        },
        sessionId: {
          type: 'string',
          description: 'Identificador opcional de sesión para mantener el contexto de la conversación.',
        },
      },
      required: ['message', 'token'],
    },
  },
  {
    name: 'reset_event_assistant_session',
    description: 'Limpia el historial de conversación almacenado para una sesión específica.',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'JWT del usuario. Se usa para validar y derivar el sessionId por defecto.',
        },
        sessionId: {
          type: 'string',
          description: 'Identificador de sesión a resetear. Si se omite, se usa uno derivado del usuario autenticado.',
        },
      },
      required: ['token'],
    },
  },
  {
    name: 'list_event_domain_tools',
    description: 'Retorna la descripción de las herramientas internas disponibles (get_available_places, create_event).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const assistantService = new AIAssistantService();

const sendResponse = (response: JsonRpcResponse) => {
  process.stdout.write(`${JSON.stringify(response)}\n`);
};

const sendError = (id: number | string | null, code: number, message: string, data?: any) => {
  sendResponse({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  });
};

const extractUserIdFromToken = (rawToken: unknown): number => {
  if (typeof rawToken !== 'string' || rawToken.trim().length === 0) {
    throw new Error('token is required and must be a non-empty string.');
  }

  const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured in environment variables.');
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (error) {
    throw new Error('Invalid or expired token.');
  }

  const userId = typeof decoded === 'object' ? (decoded as any).userId : undefined;

  if (typeof userId !== 'number' || Number.isNaN(userId)) {
    throw new Error('Token does not contain a valid userId.');
  }

  return userId;
};

const handleChatTool = async (args: any) => {
  if (!args || typeof args.message !== 'string' || args.message.trim().length === 0) {
    throw new Error('message is required and must be a non-empty string.');
  }

  const userId = extractUserIdFromToken(args.token);

  const sessionId =
    typeof args.sessionId === 'string' && args.sessionId.length > 0
      ? args.sessionId
      : `mcp-user-${userId}`;

  const existingHistory = aiConversationStore.get(sessionId);
  const cachedContext = aiConversationStore.getContext(sessionId);

  const result = await assistantService.chat({
    message: args.message,
    userId,
    sessionId,
    conversationHistory: existingHistory,
    userContext: cachedContext,
  });

  return {
    content: [
      {
        type: 'text',
        text: result.response,
      },
      {
        type: 'json',
        json: {
          toolsUsed: result.toolsUsed ?? [],
          userContext: result.userContext,
        },
      },
    ],
    conversationId: sessionId,
    toolsUsed: result.toolsUsed ?? [],
  };
};

const handleResetTool = (args: any) => {
  const userId = extractUserIdFromToken(args?.token);

  const sessionId =
    typeof args?.sessionId === 'string' && args.sessionId.length > 0
      ? args.sessionId
      : `mcp-user-${userId}`;
  aiConversationStore.clear(sessionId);

  return {
    content: [
      {
        type: 'text',
        text: `Conversation history cleared for session "${sessionId}".`,
      },
    ],
  };
};

const handleListDomainTools = () => ({
  content: [
    {
      type: 'json',
      json: availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    },
  ],
});

const handleCallTool = async (id: number | string | null, params: any) => {
  const name = params?.name;
  const args = params?.arguments ?? {};

  try {
    switch (name) {
      case 'chat_with_event_assistant':
        return sendResponse({
          jsonrpc: '2.0',
          id,
          result: await handleChatTool(args),
        });
      case 'reset_event_assistant_session':
        return sendResponse({
          jsonrpc: '2.0',
          id,
          result: handleResetTool(args),
        });
      case 'list_event_domain_tools':
        return sendResponse({
          jsonrpc: '2.0',
          id,
          result: handleListDomainTools(),
        });
      default:
        return sendError(id, -32601, `Tool "${name}" not found.`);
    }
  } catch (error: any) {
    return sendError(id, -32001, error.message ?? 'Error executing tool.', {
      stack: error.stack,
    });
  }
};

rl.on('line', async line => {
  if (!line.trim()) {
    return;
  }

  let request: JsonRpcRequest;

  try {
    request = JSON.parse(line);
  } catch (error) {
    sendError(null, -32700, 'Invalid JSON received.', { raw: line });
    return;
  }

  const { id, method, params } = request;

  switch (method) {
    case 'initialize':
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          serverInfo: {
            name: 'hackathon-mcp-server',
            version: '0.2.0',
          },
          capabilities: {
            tools: true,
          },
        },
      });
      break;
    case 'list_tools':
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOL_DEFINITIONS,
        },
      });
      break;
    case 'call_tool':
      await handleCallTool(id, params);
      break;
    case 'ping':
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: { ok: true },
      });
      break;
    case 'shutdown':
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {},
      });
      process.exit(0);
      break;
    default:
      sendError(id, -32601, `Method "${method}" not implemented.`);
  }
});

rl.on('close', () => {
  process.exit(0);
});

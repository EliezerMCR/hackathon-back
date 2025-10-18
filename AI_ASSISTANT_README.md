# AI Assistant con Gemini - Documentación

## Descripción

Este proyecto ahora incluye un asistente de IA potenciado por Gemini que permite a los usuarios crear eventos y consultar lugares disponibles usando lenguaje natural.

## Configuración

### 1. Obtener API Key de Gemini

1. Visita [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea o selecciona un proyecto
3. Genera una API Key

### 2. Configurar Variables de Entorno

Agrega una de las siguientes variables a tu archivo `.env`:

```bash
GEMINI_API_KEY=tu_api_key_aqui
# O alternativamente:
GOOGLE_API_KEY=tu_api_key_aqui
```

El sistema soporta ambas variables para compatibilidad.

### 3. Verificar Instalación

El paquete `@google/generative-ai` ya está instalado. Verifica la configuración:

```bash
curl http://localhost:3000/api/ai/health
```

Deberías recibir:
```json
{
  "success": true,
  "configured": true,
  "message": "AI service is ready"
}
```

## Endpoints Disponibles

### 1. Chat con el Asistente

**POST** `/api/ai/chat`

Envía un mensaje al asistente de IA. Requiere autenticación.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "message": "Quiero crear un evento de máximo 8 personas en un bar de la ciudad",
  "conversationHistory": []  // Opcional: historial de conversación previo
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "response": "He encontrado varios bares disponibles. Te sugiero...",
    "toolsUsed": ["get_available_places", "create_event"],
    "conversationHistory": [...]
  }
}
```

### 2. Ver Herramientas Disponibles

**GET** `/api/ai/tools`

Obtiene la lista de herramientas/capacidades del asistente.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "name": "get_available_places",
        "description": "Get a list of available places/venues where events can be created",
        "parameters": {...}
      },
      {
        "name": "create_event",
        "description": "Creates a new event at a specified place/venue",
        "parameters": {...}
      }
    ],
    "count": 2
  }
}
```

### 3. Health Check

**GET** `/api/ai/health`

Verifica el estado del servicio de IA.

## Herramientas (Tools) Disponibles

### 1. `get_available_places`

Busca lugares/venues disponibles donde se pueden crear eventos.

**Parámetros:**
- `city` (opcional): Filtrar por ciudad
- `type` (opcional): Tipo de lugar (restaurant, bar, club, park)
- `minCapacity` (opcional): Capacidad mínima requerida
- `limit` (opcional): Número máximo de resultados (default: 5)

### 2. `create_event`

Crea un nuevo evento en un lugar específico.

**Parámetros:**
- `placeName` (requerido): Nombre del lugar
- `eventName` (requerido): Nombre del evento
- `description` (opcional): Descripción del evento
- `date` (requerido): Fecha y hora en formato ISO 8601
- `minAge` (opcional): Edad mínima (default: 18)

## Ejemplos de Uso

### Ejemplo 1: Buscar lugares disponibles

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué lugares hay disponibles en la ciudad para eventos?"
  }'
```

### Ejemplo 2: Crear un evento

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quiero crear un evento llamado \"Fiesta de Cumpleaños\" en el Bar Central para el 25 de octubre a las 8pm"
  }'
```

### Ejemplo 3: Conversación completa

```bash
# Primera petición
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quiero organizar un evento, ¿qué lugares recomiendas?"
  }'

# Segunda petición (con historial)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Me gusta el primer lugar, crea un evento ahí para mañana",
    "conversationHistory": [...]  # Incluir el historial de la respuesta anterior
  }'
```

## Casos de Uso

### 1. Crear evento con lenguaje natural

**Usuario:** "Quiero crear un evento de máximo 8 personas, en un bar cerca"

**AI:**
1. Usa `get_available_places` para buscar bares disponibles
2. Presenta opciones al usuario
3. El usuario confirma
4. Usa `create_event` para crear el evento
5. Confirma la creación con detalles

### 2. Búsqueda específica

**Usuario:** "¿Hay algún restaurante disponible con capacidad para 50 personas?"

**AI:**
1. Usa `get_available_places` con parámetros `type: "restaurant"` y `minCapacity: 50`
2. Presenta los resultados

### 3. Creación directa

**Usuario:** "Crea un evento llamado 'Reunión de Networking' en el Café La Plaza para el 30 de octubre a las 6pm"

**AI:**
1. Usa `create_event` directamente con los parámetros proporcionados
2. Confirma la creación

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│           Frontend (Chat Interface)             │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│        POST /api/ai/chat (Authenticated)        │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│         AIAssistantService.chat()               │
│  - Gestiona conversación con Gemini             │
│  - Ejecuta tools según lo que Gemini decida     │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ↓                    ↓
┌──────────────┐    ┌──────────────────┐
│ Gemini API   │    │  Tools (Prisma)  │
│ - Procesa    │    │  - get_available │
│   lenguaje   │←──→│    _places       │
│ - Decide qué │    │  - create_event  │
│   tools usar │    └──────────────────┘
└──────────────┘
```

## Extender Funcionalidad

Para agregar nuevas herramientas (tools):

1. Abre `src/services/ai/tools.ts`
2. Crea una nueva constante de tipo `AITool`:

```typescript
export const myNewTool: AITool = {
  name: 'my_tool_name',
  description: 'Lo que hace la herramienta',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Descripción del parámetro'
      }
    },
    required: ['param1']
  },
  handler: async (params, userId) => {
    // Tu lógica aquí
    return { result: 'success' };
  }
};
```

3. Agrégala al array `availableTools`:

```typescript
export const availableTools: AITool[] = [
  getAvailablePlacesTool,
  createEventTool,
  myNewTool,  // Nueva herramienta
];
```

## Notas Importantes

- El asistente requiere autenticación JWT
- El `userId` se obtiene automáticamente del token
- Gemini tiene un límite de 5 iteraciones para prevenir loops infinitos
- Los errores en las herramientas se manejan gracefully
- El historial de conversación permite contexto multi-turn

## Troubleshooting

### Error: "GEMINI_API_KEY is not defined"
- Verifica que `.env` tenga la variable `GEMINI_API_KEY`
- Reinicia el servidor después de agregar la variable

### Error: "User not authenticated"
- Asegúrate de incluir el header `Authorization: Bearer <token>`
- Verifica que el token sea válido

### Error: "Tool not found"
- Verifica que el nombre de la herramienta esté en `availableTools`
- Revisa los logs del servidor para más detalles

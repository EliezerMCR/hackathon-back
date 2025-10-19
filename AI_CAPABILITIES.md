# Capacidades actuales de la IA

## 🎤 Entrada de Audio (NUEVO)

El asistente ahora soporta mensajes de voz mediante el endpoint `/api/ai/audio`.

### Flujo de procesamiento de audio:
1. **Recepción**: El usuario envía un archivo de audio (MP3, WAV, WebM, OGG, M4A, FLAC, AAC)
2. **Transcripción**: Gemini convierte el audio a texto en español (traduce automáticamente si está en otro idioma)
3. **Procesamiento**: La transcripción se procesa como un mensaje de chat normal
4. **Ejecución de tools**: El asistente ejecuta las herramientas necesarias basándose en la transcripción
5. **Respuesta**: Se devuelve tanto la transcripción como la respuesta del asistente

### Características:
- **Formatos soportados**: MP3, WAV, WebM, OGG, M4A, FLAC, AAC
- **Duración máxima recomendada**: 2 minutos
- **Tamaño máximo**: 10 MB
- **Idioma**: El audio se transcribe siempre en español (con traducción automática si es necesario)
- **Contexto conversacional**: Mantiene el historial de conversación como el chat de texto

### Ejemplo de uso:
**Audio del usuario:** "Hola, estoy buscando lugares en Caracas para organizar un evento de aproximadamente 50 personas este fin de semana"

**Respuesta del sistema:**
```json
{
  "transcription": "Hola, estoy buscando lugares en Caracas para organizar un evento de aproximadamente cincuenta personas este fin de semana",
  "response": "Encontré 3 lugares en Caracas que pueden acomodar 50 personas: 1. Centro de Convenciones - Capacidad 100 personas...",
  "toolsUsed": ["get_available_places"]
}
```

---

## Herramientas disponibles

### `get_available_places`
- Busca lugares disponibles para eventos en una ciudad dada.
- Permite filtrar por tipo, capacidad mínima y límite de resultados.
- Devuelve información con nombre, ciudad, tipo y un resumen listo para mostrar.

### `get_place_reviews`
- Obtiene hasta 5 reseñas recientes de un lugar específico.
- Calcula promedio de calificaciones y número total de reseñas.
- Incluye tono (positivo/neutral/negativo) y comentarios sanitizados.

### `create_event`
- Crea un evento en un lugar existente.
- Acepta nombre, descripción, fecha en lenguaje natural, edad mínima, comunidad y visibilidad.
- Valida membresía en la comunidad y que los eventos públicos cuenten con comunidad.
- Interpreta fechas en español y genera hora/localidad final en zona `EVENT_TIMEZONE`.

### `get_upcoming_events`
- Lista eventos organizados por el usuario para los próximos *n* días (por defecto 30).
- Cada evento incluye hora local en español, ticketInfo (si requiere compra), reseñas recientes, detalles del lugar y resumen de tickets.
- Conserva los IDs reales para usarlos en acciones posteriores.

### `get_joined_events`
- Lista eventos en los que el usuario es asistente.
- Incluye hora local en español, información de lugar/comunidad/organizador, ticketInfo y reseñas.
- Proporciona un resumen textual simple con fecha y hora.

### `get_community_events`
- Devuelve eventos de una comunidad a la que pertenece el usuario.
- Filtra por estado, visibilidad, rango temporal y límite.
- Incluye asistentes, ticketInfo, reseñas y hora local en español.

### `join_community_event`
- Registra al usuario en eventos públicos de una comunidad donde es miembro activo.
- Evita duplicados y responde con confirmado o “ya estabas inscrito”.
- Ofrece hora local en español en la confirmación.

### `update_event`
- Permite modificar eventos que el usuario organiza.
- Recibe `eventId` o referencia textual (`eventLabel`/`referenceDate`) para localizar el evento.
- Actualiza nombre, descripción, fecha (interpretando lenguaje natural) y puede eliminar hora de término (`removeEndTime=true`).
- Valida que el usuario sea el organizador.

### `get_user_communities`
- Lista las comunidades a las que pertenece el usuario, devolviendo ID, rol, miembros y número de eventos.

### `get_community_overview`
- Devuelve un resumen de una comunidad concreta (nombre, descripción, miembros, eventos próximos, administradores) y confirma si el usuario pertenece a ella.

## Reglas y comportamiento del asistente
- Siempre responde en español y en texto plano (sin Markdown).
- Ejecuta `get_upcoming_events`/`get_joined_events` de forma proactiva ante solicitudes como “qué planes tengo”.
- Conserva y reutiliza los IDs obtenidos, sin pedírselos al usuario.
- Presenta eventos con fecha y hora en formato español (“lunes 20 de octubre de 2025 a las 2:00 pm”).
- Para eliminar la hora de finalización se usa `update_event` con `removeEndTime=true`.
- Solo modifica eventos que organiza el usuario; si no es propietario, lo indica y sugiere contactar al organizador.
- Al crear eventos en comunidades, valida membresía y visibilidad.
- Interpreta fechas en lenguaje natural en español y normaliza a la zona configurada.
- Sanitiza reseñas, evita inventar información y usa exclusivamente los datos de las herramientas.
- Usa la ciudad registrada del usuario como valor por defecto en `get_available_places`; solo pregunta si falta o el usuario desea otra.
- Ofrece siempre un siguiente paso (reservar, buscar más opciones, cambiar filtros) y evita respuestas como “ya te di la información”.
- Con las nuevas herramientas de comunidad puede obtener IDs reales y resúmenes antes de crear o gestionar planes comunitarios.
- Puede recomendar nuevas comunidades mediante `get_recommended_communities`, priorizando las más activas y mostrando eventos próximos para que el usuario elija.

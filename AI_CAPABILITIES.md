# Capacidades actuales de la IA

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

## Reglas y comportamiento del asistente

- Siempre responde en español y en texto plano (sin Markdown).
- Debe ejecutar `get_upcoming_events`/`get_joined_events` de forma proactiva ante solicitudes como “qué planes tengo”.
- Debe guardar IDs de eventos y reutilizarlos sin pedirlos al usuario.
- Al presentar eventos o confirmar acciones, siempre muestra fecha y hora en español (`lunes 20 de octubre 2025, 02:00 pm`).
- Para eliminar la hora de finalización se usa `update_event` con `removeEndTime=true`; no se edita la descripción para simularlo.
- Solo modifica eventos que organiza el usuario; si no es propietario, debe indicarlo y sugerir contactar al organizador.
- Al crear eventos en comunidades, valida membresía y restringe visibilidad pública a eventos con comunidad.
- Procesa fechas en lenguaje natural en español (por ejemplo “lunes próximo a las 2pm”) y normaliza a la zona configurada.
- Sanitiza reseñas, evita inventar información y usa exclusivamente datos provenientes de las herramientas.

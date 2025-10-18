# AI Tools Overview

## Nuevas capacidades
- `get_community_events`: permite al asistente consultar eventos de una comunidad a la que pertenece la persona. Acepta filtros de estado, visibilidad y la opción `upcomingOnly` para mostrar solo planes futuros.
- `join_community_event`: habilita que el asistente registre al usuario en eventos públicos de comunidades de las que forma parte, validando membresía activa y evitando duplicados.

Ambas herramientas respetan la zona horaria configurada por `EVENT_TIMEZONE` y devuelven descripciones legibles de las fechas para facilitar la respuesta conversacional.

## Consideraciones
- El asistente solo puede consultar o unirse a eventos de comunidades donde el usuario esté activo. La verificación usa la información de `Community_Member`.
- Un evento debe tener visibilidad `PUBLIC` y estar asociado a una comunidad para poder unirse automáticamente.
- Después de actualizar el esquema de Prisma, recuerda ejecutar `npx prisma generate` para exponer los nuevos modelos (`EventAttendee`, `EventVisibility`) al cliente.
- `get_joined_events`: retorna los eventos futuros en los que el usuario ya está inscrito como asistente, incluyendo hora local, información básica de tickets y reseñas recientes.

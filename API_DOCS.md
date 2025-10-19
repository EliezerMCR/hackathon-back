# 📚 Documentación de la API

## 🔐 Autenticación

### POST `/api/auth/signup`
Registro de usuario con verificación de documento de identidad.

### POST `/api/auth/signup-with-privilege`
Registro de usuario con privilegios especiales (ADMIN, BUSINESS, VIP).

### POST `/api/auth/login`
Inicio de sesión.

### POST `/api/auth/forgot-password`
Solicitud de reseteo de contraseña.

### POST `/api/auth/reset-password`
Reseteo de contraseña con token.

---

## 👤 Usuarios

### GET `/api/users/me`
Obtener información del usuario autenticado.

### PUT `/api/users/me`
Actualizar información del usuario autenticado.

### DELETE `/api/users/me`
Eliminar cuenta del usuario autenticado.

### GET `/api/users/me/places`
Obtener lugares del usuario autenticado.

### GET `/api/users/me/events`
Obtener eventos organizados por el usuario.

### GET `/api/users/me/events/joined`
Obtener eventos a los que el usuario asiste.

### GET `/api/users/:id`
Obtener usuario por ID (ADMIN).

### PUT `/api/users/:id`
Actualizar usuario por ID (ADMIN).

### DELETE `/api/users/:id`
Eliminar usuario por ID (ADMIN).

### GET `/api/users`
Listar todos los usuarios (ADMIN).

---

## 🏢 Lugares

### GET `/api/places`
Listar lugares con filtros (ciudad, país, tipo, estado).

### GET `/api/places/:id`
Obtener lugar por ID.

### POST `/api/places`
Crear nuevo lugar.

### PUT `/api/places/:id`
Actualizar lugar.

### DELETE `/api/places/:id`
Eliminar lugar.

### GET `/api/places/:id/products`
Obtener productos de un lugar.

### GET `/api/places/:id/events`
Obtener eventos de un lugar.

### GET `/api/places/:id/reviews`
Obtener reseñas de un lugar.

---

## 🎉 Eventos

### GET `/api/events`
Listar eventos con filtros (lugar, comunidad, estado, visibilidad).

### GET `/api/events/:id`
Obtener evento por ID.

### POST `/api/events`
Crear nuevo evento.

### PUT `/api/events/:id`
Actualizar evento.

### DELETE `/api/events/:id`
Eliminar evento.

### POST `/api/events/:id/join`
Unirse a un evento.

### DELETE `/api/events/:id/leave`
Abandonar un evento.

### GET `/api/events/:id/attendees`
Listar asistentes de un evento.

### POST `/api/events/:id/tickets`
Crear ticket para evento.

### GET `/api/events/:id/tickets`
Obtener tickets de evento.

---

## 🛍️ Productos

### GET `/api/products`
Listar productos con filtros (lugar, precio).

### GET `/api/products/:id`
Obtener producto por ID.

### POST `/api/products`
Crear producto.

### PUT `/api/products/:id`
Actualizar producto.

### DELETE `/api/products/:id`
Eliminar producto.

---

## 👥 Comunidades

### GET `/api/communities`
Listar todas las comunidades.

### GET `/api/communities/:id`
Obtener comunidad por ID.

### POST `/api/communities`
Crear comunidad.

### PUT `/api/communities/:id`
Actualizar comunidad.

### DELETE `/api/communities/:id`
Eliminar comunidad.

### GET `/api/communities/:id/members`
Listar miembros de una comunidad.

### POST `/api/communities/:id/members`
Agregar miembro a comunidad.

### PUT `/api/communities/:id/members/:userId`
Actualizar rol de miembro.

### DELETE `/api/communities/:id/members/:userId`
Eliminar miembro de comunidad.

### POST `/api/communities/:id/events`
Crear evento de comunidad.

### GET `/api/communities/:id/events`
Obtener eventos de comunidad.

---

## 📋 Solicitudes (Requests)

### GET `/api/requests`
Listar solicitudes (comunidad, usuario, estado).

### GET `/api/requests/:id`
Obtener solicitud por ID.

### POST `/api/requests`
Crear solicitud para unirse a comunidad.

### PUT `/api/requests/:id`
Aceptar o rechazar solicitud.

### DELETE `/api/requests/:id`
Cancelar solicitud.

---

## 💌 Invitaciones

### GET `/api/invitations`
Listar invitaciones con filtros.

### GET `/api/invitations/:id`
Obtener invitación por ID.

### POST `/api/invitations`
Crear invitación a evento/lugar.

### PUT `/api/invitations/:id`
Aceptar o rechazar invitación.

### DELETE `/api/invitations/:id`
Eliminar invitación.

---

## ⭐ Reseñas

### GET `/api/reviews`
Listar reseñas con filtros (usuario, lugar, evento).

### GET `/api/reviews/:id`
Obtener reseña por ID.

### GET `/api/reviews/place/:placeId/stats`
Obtener estadísticas de reseñas de lugar.

### POST `/api/reviews`
Crear reseña.

### PUT `/api/reviews/:id`
Actualizar reseña.

### DELETE `/api/reviews/:id`
Eliminar reseña.

---

## 🎟️ Tickets

### GET `/api/tickets/bought`
Listar tickets comprados.

### GET `/api/tickets/bought/:id`
Obtener ticket comprado por ID.

### POST `/api/tickets/buy`
Comprar ticket.

### GET `/api/tickets/:id`
Obtener información de un tipo de ticket.

### PUT `/api/tickets/:id`
Actualizar ticket.

### DELETE `/api/tickets/:id`
Eliminar tipo de ticket.

---

## 🎁 Promociones

### GET `/api/promotions`
Listar promociones con filtros (tipo, membresía, activas).

### GET `/api/promotions/:id`
Obtener promoción por ID.

### POST `/api/promotions`
Crear promoción.

### PUT `/api/promotions/:id`
Actualizar promoción.

### DELETE `/api/promotions/:id`
Eliminar promoción.

---

## 📢 Anuncios (Ads)

### GET `/api/ads`
Listar anuncios con filtros (lugar, evento, activos).

### GET `/api/ads/:id`
Obtener anuncio por ID.

### POST `/api/ads`
Crear anuncio.

### PUT `/api/ads/:id`
Actualizar anuncio.

### DELETE `/api/ads/:id`
Eliminar anuncio.

---

## 🔔 Notificaciones

### GET `/api/notifications`
Listar notificaciones del usuario.

### GET `/api/notifications/:id`
Obtener notificación por ID.

### PUT `/api/notifications/mark-all-read`
Marcar todas las notificaciones como leídas.

### PUT `/api/notifications/:id`
Actualizar notificación.

### DELETE `/api/notifications/:id`
Eliminar notificación.

### POST `/api/notifications`
Crear notificación (ADMIN).

---

## 🏷️ Categorías

### GET `/api/categories`
Listar todas las categorías.

### GET `/api/categories/:id`
Obtener categoría por ID.

### POST `/api/categories`
Crear categoría (ADMIN).

### PUT `/api/categories/:id`
Actualizar categoría (ADMIN).

### DELETE `/api/categories/:id`
Eliminar categoría (ADMIN).

---

## 🤖 Asistente IA

### POST `/api/ai/chat`
Enviar mensaje al asistente IA.

**Request Body:**
```json
{
  "message": "Busco lugares en Caracas para un evento de 50 personas",
  "conversationId": "optional-session-id",
  "resetConversation": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Encontré 3 lugares en Caracas que pueden acomodar 50 personas...",
    "toolsUsed": ["get_available_places"],
    "conversationHistory": [...],
    "conversationId": "user-123"
  }
}
```

### POST `/api/ai/audio`
Enviar audio para transcribir y procesar con IA.

**Request (multipart/form-data):**
- `audio`: Archivo de audio (MP3, WAV, WebM, OGG, M4A, FLAC, AAC)
- `conversationId`: (opcional) ID de sesión
- `resetConversation`: (opcional) "true" para reiniciar conversación

**Formatos soportados:**
- MP3 (audio/mpeg)
- WAV (audio/wav)
- WebM (audio/webm)
- OGG (audio/ogg)
- M4A (audio/mp4)
- FLAC (audio/flac)
- AAC (audio/aac)

**Límites:**
- Tamaño máximo: 10 MB
- Duración recomendada: hasta 2 minutos

**Response:**
```json
{
  "success": true,
  "data": {
    "transcription": "Busco lugares en Caracas para un evento de cincuenta personas",
    "response": "Encontré 3 lugares en Caracas que pueden acomodar 50 personas...",
    "toolsUsed": ["get_available_places"],
    "conversationHistory": [...],
    "conversationId": "user-123"
  }
}
```

**Ejemplo con curl:**
```bash
curl -X POST https://tu-api.com/api/ai/audio \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@voice-message.mp3" \
  -F "conversationId=session-123"
```

### GET `/api/ai/tools`
Obtener lista de herramientas disponibles del IA.

### DELETE `/api/ai/conversation`
Limpiar historial de conversación.

**Query Params:**
- `conversationId`: (opcional) ID de conversación específica

### GET `/api/ai/health`
Verificar estado del servicio IA.

---

## 🪪 Verificación de Identidad

### POST `/api/identity/:id/verify-document`
Verificar documento de identidad de usuario.

---

## 📝 Notas Generales

- **Autenticación**: La mayoría de endpoints requieren token JWT en header `Authorization: Bearer <token>`
- **Roles**: `USER`, `ADMIN`, `BUSINESS`, `VIP`
- **Paginación**: Usa parámetros `page` y `limit` donde aplique
- **Filtros**: Disponibles en endpoints GET según recurso
- **Imágenes**: Enviadas como Base64 o archivos multipart

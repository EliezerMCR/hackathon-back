# 📚 API Reference - Backend Hackathon

> Documentación completa de todos los endpoints del API

## 📋 Índice

- [Autenticación](#-autenticación)
- [Usuarios](#-usuarios)
- [Lugares (Places)](#-lugares-places)
- [Productos](#-productos)
- [Eventos](#-eventos)
- [Comunidades](#-comunidades)
- [Solicitudes (Requests)](#-solicitudes-requests)
- [Invitaciones](#-invitaciones)
- [Tickets](#-tickets)
- [Promociones](#-promociones)
- [Anuncios (Ads)](#-anuncios-ads)
- [Reviews](#-reviews)
- [Categorías](#-categorías)

---

## 🔐 Autenticación

### POST /api/auth/signup
Registro de nuevo usuario (rol CLIENT por defecto).

**Body:**
```json
{
  "name": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "birthDate": "1990-01-15",
  "gender": "MAN",
  "city": "Lima",
  "country": "Perú"
}
```

**Response:** `201 Created`
```json
{
  "message": "User created successfully"
}
```

---

### POST /api/auth/signup-with-privilege
Registro con privilegios (solo ADMIN). Requiere autenticación.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "María",
  "lastName": "García",
  "email": "maria@example.com",
  "password": "password123",
  "birthDate": "1985-05-20",
  "gender": "WOMAN",
  "role": "MARKET",
  "city": "Lima",
  "country": "Perú"
}
```

**Response:** `201 Created`

---

### POST /api/auth/login
Iniciar sesión y obtener token JWT.

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "juan@example.com",
    "name": "Juan",
    "lastName": "Pérez",
    "role": "CLIENT",
    "membership": "NORMAL"
  }
}
```

---

## 👥 Usuarios

### GET /api/users
Obtener todos los usuarios.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "role": "CLIENT",
    "membership": "NORMAL",
    "city": "Lima",
    "country": "Perú"
  }
]
```

---

### GET /api/users/:id
Obtener un usuario específico.

**Response:** `200 OK`

---

### PUT /api/users/:id
Actualizar un usuario.

**Body:**
```json
{
  "name": "Juan Carlos",
  "city": "Cusco"
}
```

**Response:** `200 OK`

---

### DELETE /api/users/:id
Eliminar un usuario.

**Response:** `200 OK`
```json
{
  "message": "Usuario 'Juan Pérez' eliminado exitosamente",
  "id": 1
}
```

---

## 📍 Lugares (Places)

### GET /api/places
Obtener lugares con filtros y paginación.

**Query Parameters:**
- `city` - Filtrar por ciudad
- `country` - Filtrar por país
- `type` - Filtrar por tipo de lugar
- `status` - PENDING | ACCEPTED | REJECTED
- `page` - Número de página (default: 1)
- `limit` - Resultados por página (default: 10)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "name": "Bar Central",
      "direction": "Av. Principal 123",
      "city": "Lima",
      "country": "Perú",
      "capacity": 150,
      "type": "Bar",
      "status": "ACCEPTED",
      "owner": {
        "id": 2,
        "name": "María",
        "lastName": "García"
      },
      "_count": {
        "products": 25,
        "events": 8,
        "reviews": 42
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

### GET /api/places/:id
Obtener un lugar específico con todos sus detalles.

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Bar Central",
  "direction": "Av. Principal 123",
  "city": "Lima",
  "country": "Perú",
  "capacity": 150,
  "type": "Bar",
  "mapUrl": "https://maps.google.com/...",
  "image": "https://...",
  "owner": { ... },
  "products": [ ... ],
  "events": [ ... ],
  "reviews": [ ... ]
}
```

---

### POST /api/places
Crear un nuevo lugar.

**Body:**
```json
{
  "name": "Club Nocturno",
  "direction": "Calle Luna 456",
  "city": "Lima",
  "country": "Perú",
  "capacity": 300,
  "type": "Club",
  "ownerId": 2,
  "mapUrl": "https://maps.google.com/...",
  "image": "https://..."
}
```

**Response:** `201 Created`
```json
{
  "message": "Place creado exitosamente",
  "place": { ... }
}
```

---

### PUT /api/places/:id
Actualizar un lugar.

**Response:** `200 OK`

---

### DELETE /api/places/:id
Eliminar un lugar.

**Response:** `200 OK`
```json
{
  "message": "Place 'Bar Central' eliminado exitosamente",
  "id": 1
}
```

---

## 🍺 Productos

### GET /api/products
Obtener productos con filtros.

**Query Parameters:**
- `placeId` - Filtrar por lugar
- `minPrice` - Precio mínimo
- `maxPrice` - Precio máximo

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Cerveza Artesanal",
    "price": "15.00",
    "image": "https://...",
    "place": {
      "id": 1,
      "name": "Bar Central",
      "city": "Lima"
    },
    "promotions": [
      {
        "id": 1,
        "discount": 20,
        "membership": "VIP"
      }
    ]
  }
]
```

---

### GET /api/products/:id
Obtener un producto específico.

**Response:** `200 OK`

---

### POST /api/products
Crear un nuevo producto.

**Body:**
```json
{
  "name": "Cerveza Premium",
  "price": 18.50,
  "image": "https://...",
  "placeId": 1
}
```

**Response:** `201 Created`
```json
{
  "message": "Producto creado exitosamente",
  "product": { ... }
}
```

---

### PUT /api/products/:id
Actualizar un producto.

**Response:** `200 OK`

---

### DELETE /api/products/:id
Eliminar un producto.

**Response:** `200 OK`
```json
{
  "message": "Producto 'Cerveza Premium' eliminado exitosamente",
  "id": 1
}
```

---

## 🎉 Eventos

### GET /api/events
Obtener eventos con filtros y paginación.

**Query Parameters:**
- `placeId` - Filtrar por lugar
- `communityId` - Filtrar por comunidad
- `organizerId` - Filtrar por organizador
- `status` - Estado del evento
- `minAge` - Edad mínima
- `timeBegin` - Fecha inicio (ISO)
- `timeEnd` - Fecha fin (ISO)
- `page` - Número de página (default: 1)
- `limit` - Resultados por página (default: 10)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "name": "Fiesta Techno",
      "description": "La mejor música electrónica",
      "timeBegin": "2025-02-15T22:00:00Z",
      "timeEnd": "2025-02-16T05:00:00Z",
      "minAge": 18,
      "status": "proximo",
      "place": {
        "id": 1,
        "name": "Club Nocturno",
        "city": "Lima"
      },
      "organizer": {
        "id": 2,
        "name": "DJ Producer"
      },
      "community": {
        "id": 1,
        "name": "Techno Lovers"
      },
      "_count": {
        "tickets": 150,
        "reviews": 25,
        "invitations": 10
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 35,
    "totalPages": 4
  }
}
```

---

### GET /api/events/:id
Obtener un evento específico con todos sus detalles.

**Response:** `200 OK`

---

### POST /api/events
Crear un nuevo evento.

**Body:**
```json
{
  "name": "Fiesta Rock",
  "description": "Noche de rock en vivo",
  "timeBegin": "2025-03-10T21:00:00Z",
  "timeEnd": "2025-03-11T03:00:00Z",
  "placeId": 1,
  "organizerId": 2,
  "communityId": 1,
  "minAge": 18,
  "externalUrl": "https://eventbrite.com/..."
}
```

**Response:** `201 Created`
```json
{
  "message": "Evento creado exitosamente",
  "event": { ... }
}
```

---

### PUT /api/events/:id
Actualizar un evento.

**Body:**
```json
{
  "name": "Fiesta Rock 2.0",
  "status": "finalizado"
}
```

**Response:** `200 OK`

---

### DELETE /api/events/:id
Eliminar un evento.

**Response:** `200 OK`
```json
{
  "message": "Evento 'Fiesta Rock' eliminado exitosamente",
  "id": 1
}
```

---

## 🏘️ Comunidades

### GET /api/communities
Obtener todas las comunidades.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Techno Lovers Lima",
    "_count": {
      "members": 150,
      "events": 12,
      "requests": 5
    }
  }
]
```

---

### GET /api/communities/:id
Obtener una comunidad específica.

**Response:** `200 OK`

---

### POST /api/communities
Crear una nueva comunidad.

**Body:**
```json
{
  "name": "Rock Fans Perú"
}
```

**Response:** `201 Created`
```json
{
  "message": "Comunidad creada exitosamente",
  "community": {
    "id": 2,
    "name": "Rock Fans Perú"
  }
}
```

---

### PUT /api/communities/:id
Actualizar una comunidad.

**Response:** `200 OK`

---

### DELETE /api/communities/:id
Eliminar una comunidad.

**Response:** `200 OK`
```json
{
  "message": "Comunidad 'Rock Fans Perú' eliminada exitosamente",
  "id": 2
}
```

---

## 👨‍👩‍👧‍👦 Miembros de Comunidad

### GET /api/communities/:id/members
Obtener todos los miembros de una comunidad.

**Response:** `200 OK`

---

### POST /api/communities/:id/members
Agregar un miembro a la comunidad (solo ADMIN).

**Body:**
```json
{
  "userId": 5,
  "role": "CLIENT"
}
```

**Response:** `201 Created`

---

### DELETE /api/communities/:id/members/:userId
Remover un miembro de la comunidad.

**Response:** `200 OK`
```json
{
  "message": "Miembro eliminado exitosamente de la comunidad",
  "userId": 5,
  "communityId": 1
}
```

---

## 📝 Solicitudes (Requests)

### GET /api/requests
Obtener solicitudes con filtros.

**Query Parameters:**
- `userId` - Filtrar por usuario
- `status` - PENDING | ACCEPTED | REJECTED

**Response:** `200 OK`

---

### GET /api/requests/:id
Obtener una solicitud específica.

**Response:** `200 OK`

---

### PATCH /api/requests/:id
Aceptar o rechazar una solicitud.

**Body:**
```json
{
  "status": "ACCEPTED",
  "acceptedById": 2
}
```

**Response:** `200 OK`

---

### DELETE /api/requests/:id
Eliminar/cancelar una solicitud.

**Response:** `200 OK`
```json
{
  "message": "Solicitud eliminada exitosamente",
  "id": 1,
  "fromId": 5,
  "communityId": 1
}
```

---

### GET /api/communities/:id/requests
Obtener solicitudes de una comunidad específica.

**Response:** `200 OK`

---

### POST /api/communities/:id/requests
Crear una solicitud para unirse a una comunidad.

**Body:**
```json
{
  "userId": 5
}
```

**Response:** `201 Created`

---

## 💌 Invitaciones

### GET /api/invitations
Obtener invitaciones con filtros.

**Query Parameters:**
- `fromId` - Filtrar por remitente
- `toId` - Filtrar por destinatario
- `status` - PENDING | ACCEPTED | REJECTED

**Response:** `200 OK`

---

### GET /api/invitations/:id
Obtener una invitación específica.

**Response:** `200 OK`

---

### POST /api/invitations
Crear una nueva invitación.

**Body:**
```json
{
  "fromId": 1,
  "toId": 5,
  "placeId": 1,
  "eventId": 2,
  "invitationDate": "2025-02-15T22:00:00Z"
}
```

**Response:** `201 Created`

---

### PATCH /api/invitations/:id/status
Aceptar o rechazar una invitación.

**Body:**
```json
{
  "status": "ACCEPTED"
}
```

**Response:** `200 OK`

---

### DELETE /api/invitations/:id
Eliminar/cancelar una invitación.

**Response:** `200 OK`
```json
{
  "message": "Invitación eliminada exitosamente",
  "id": 1,
  "fromId": 1,
  "toId": 5
}
```

---

## 🎫 Tickets

### GET /api/tickets/bought
Obtener todos los tickets comprados.

**Query Parameters:**
- `userId` - Filtrar por usuario
- `eventId` - Filtrar por evento

**Response:** `200 OK`

---

### GET /api/tickets/bought/:id
Obtener un ticket comprado específico.

**Response:** `200 OK`

---

### POST /api/tickets/:id/buy
Comprar un ticket (mock de pago).

**Body:**
```json
{
  "userId": 1,
  "quantity": 2
}
```

**Response:** `201 Created`
```json
{
  "message": "Ticket comprado exitosamente",
  "boughtTicket": {
    "id": 15,
    "userId": 1,
    "ticketId": 3,
    "price": "50.00",
    "createdAt": "2025-01-20T10:30:00Z"
  },
  "ticketDetails": {
    "type": "VIP",
    "description": "Acceso total al evento"
  }
}
```

---

### DELETE /api/tickets/bought/:id
Cancelar/reembolsar un ticket comprado.

**Response:** `200 OK`
```json
{
  "message": "Ticket reembolsado/eliminado exitosamente",
  "id": 15,
  "userId": 1,
  "ticketId": 3
}
```

---

## 🎁 Promociones

### GET /api/promotions
Obtener promociones con filtros.

**Query Parameters:**
- `type` - PRODUCT | TICKET
- `membership` - NORMAL | VIP
- `active` - true/false (promociones vigentes)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "type": "PRODUCT",
    "discount": 20,
    "membership": "VIP",
    "timeBegin": "2025-01-01T00:00:00Z",
    "timeEnd": "2025-12-31T23:59:59Z",
    "product": {
      "id": 1,
      "name": "Cerveza Premium",
      "place": {
        "id": 1,
        "name": "Bar Central"
      }
    }
  }
]
```

---

### GET /api/promotions/:id
Obtener una promoción específica.

**Response:** `200 OK`

---

### POST /api/promotions
Crear una nueva promoción.

**Body:**
```json
{
  "type": "TICKET",
  "ticketId": 5,
  "discount": 15,
  "membership": "NORMAL",
  "timeBegin": "2025-02-01T00:00:00Z",
  "timeEnd": "2025-02-28T23:59:59Z"
}
```

**Response:** `201 Created`
```json
{
  "message": "Promoción creada exitosamente",
  "promotion": { ... }
}
```

---

### PUT /api/promotions/:id
Actualizar una promoción.

**Response:** `200 OK`

---

### DELETE /api/promotions/:id
Eliminar una promoción.

**Response:** `200 OK`
```json
{
  "message": "Promoción eliminada exitosamente",
  "id": 1,
  "type": "PRODUCT",
  "discount": 20
}
```

---

## 📢 Anuncios (Ads)

### GET /api/ads
Obtener anuncios con filtros.

**Query Parameters:**
- `placeId` - Filtrar por lugar
- `eventId` - Filtrar por evento
- `active` - true/false (anuncios vigentes)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "timeBegin": "2025-02-01T00:00:00Z",
    "timeEnd": "2025-02-28T23:59:59Z",
    "place": {
      "id": 1,
      "name": "Bar Central",
      "city": "Lima",
      "image": "https://..."
    },
    "event": {
      "id": 2,
      "name": "Fiesta Techno",
      "timeBegin": "2025-02-15T22:00:00Z"
    }
  }
]
```

---

### GET /api/ads/:id
Obtener un anuncio específico.

**Response:** `200 OK`

---

### POST /api/ads
Crear un nuevo anuncio.

**Body:**
```json
{
  "placeId": 1,
  "eventId": 2,
  "timeBegin": "2025-03-01T00:00:00Z",
  "timeEnd": "2025-03-31T23:59:59Z"
}
```

**Response:** `201 Created`
```json
{
  "message": "Anuncio creado exitosamente",
  "ad": { ... }
}
```

---

### PUT /api/ads/:id
Actualizar un anuncio.

**Response:** `200 OK`

---

### DELETE /api/ads/:id
Eliminar un anuncio.

**Response:** `200 OK`
```json
{
  "message": "Anuncio eliminado exitosamente",
  "id": 1,
  "placeId": 1
}
```

---

## ⭐ Reviews

### GET /api/reviews
Obtener reviews con filtros.

**Query Parameters:**
- `userId` - Filtrar por usuario
- `placeId` - Filtrar por lugar
- `eventId` - Filtrar por evento

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "calification": 5,
    "comment": "Excelente lugar, muy recomendado",
    "createdAt": "2025-01-15T10:00:00Z",
    "user": {
      "id": 1,
      "name": "Juan",
      "lastName": "Pérez",
      "image": "https://..."
    },
    "place": {
      "id": 1,
      "name": "Bar Central"
    }
  }
]
```

---

### GET /api/reviews/place/:placeId/stats
Obtener estadísticas de calificación de un lugar.

**Response:** `200 OK`
```json
{
  "placeId": 1,
  "totalReviews": 42,
  "averageRating": 4.5,
  "distribution": {
    "5": 25,
    "4": 10,
    "3": 5,
    "2": 1,
    "1": 1
  }
}
```

---

### GET /api/reviews/event/:eventId/stats
Obtener estadísticas de calificación de un evento.

**Response:** `200 OK`

---

### GET /api/reviews/:id
Obtener un review específico.

**Response:** `200 OK`

---

### POST /api/reviews
Crear un nuevo review.

**Body:**
```json
{
  "userId": 1,
  "placeId": 1,
  "eventId": 2,
  "calification": 5,
  "comment": "Increíble experiencia!"
}
```

**Response:** `201 Created`
```json
{
  "message": "Review creado exitosamente",
  "review": { ... }
}
```

---

### PUT /api/reviews/:id
Actualizar un review.

**Body:**
```json
{
  "calification": 4,
  "comment": "Muy bueno, pero puede mejorar"
}
```

**Response:** `200 OK`

---

### DELETE /api/reviews/:id
Eliminar un review.

**Response:** `200 OK`
```json
{
  "message": "Review eliminado exitosamente",
  "id": 1,
  "userId": 1,
  "placeId": 1
}
```

---

## � Categorías

### GET /api/categories
Obtener todas las categorías.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Tecnología",
    "createdAt": "2025-01-20T10:00:00Z",
    "createdBy": 1,
    "creator": {
      "id": 1,
      "name": "Juan Carlos",
      "lastName": "Administrador",
      "email": "admin@hackathon.com",
      "role": "ADMIN"
    }
  }
]
```

---

### GET /api/categories/:id
Obtener una categoría específica.

**Response:** `200 OK`

---

### POST /api/categories
Crear una nueva categoría (solo ADMIN).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Arte"
}
```

**Response:** `201 Created`
```json
{
  "message": "Categoría creada exitosamente",
  "category": {
    "id": 9,
    "name": "Arte",
    "createdAt": "2025-01-20T15:30:00Z",
    "createdBy": 1,
    "creator": {
      "id": 1,
      "name": "Juan Carlos",
      "lastName": "Administrador",
      "email": "admin@hackathon.com",
      "role": "ADMIN"
    }
  }
}
```

---

### PUT /api/categories/:id
Actualizar una categoría (solo ADMIN).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Artes Plásticas"
}
```

**Response:** `200 OK`
```json
{
  "message": "Categoría actualizada exitosamente",
  "category": { ... }
}
```

---

### DELETE /api/categories/:id
Eliminar una categoría (solo ADMIN).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Categoría 'Arte' eliminada exitosamente",
  "id": 9
}
```

---

## �🔒 Autenticación en Endpoints

Algunos endpoints requieren autenticación. Incluye el token JWT en el header:

```
Authorization: Bearer <tu-token-jwt>
```

### Endpoints que requieren autenticación:
- POST /api/auth/signup-with-privilege (requiere rol ADMIN)
- Todos los endpoints de creación, actualización y eliminación
- GET endpoints públicos generalmente NO requieren autenticación

---

## 📊 Códigos de Estado HTTP

- `200 OK` - Solicitud exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Datos de entrada inválidos
- `401 Unauthorized` - No autenticado o token inválido
- `403 Forbidden` - No tiene permisos para esta acción
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto (ej: email ya existe)
- `500 Internal Server Error` - Error del servidor

---

## 🚀 Variables de Entorno Requeridas

```bash
DATABASE_URL="postgresql://..."
PORT=3000
NODE_ENV=development
JWT_SECRET="tu-secret-key"
JWT_EXPIRES_IN="7d"
```

---

## 📝 Notas Adicionales

1. **Paginación**: Los endpoints que retornan listas suelen soportar `page` y `limit`
2. **Fechas**: Todas las fechas deben estar en formato ISO 8601
3. **IDs**: Todos los IDs son enteros
4. **Enum Values**:
   - ROLE: CLIENT, MARKET, ADMIN
   - Status: PENDING, ACCEPTED, REJECTED
   - Gender: MAN, WOMAN
   - Membership: NORMAL, VIP
   - PromotionType: PRODUCT, TICKET

---

**Versión:** 1.0  
**Última actualización:** 17/10/2025 09:10pm

# API Reference - Semana 1

## 📋 Tabla de Contenidos
- [Comunidades](#comunidades)
- [Miembros de Comunidad](#miembros-de-comunidad)
- [Solicitudes (Requests)](#solicitudes-requests)
- [Invitaciones](#invitaciones)
- [Tickets (Compras)](#tickets-compras)

---

## 🏘️ Comunidades

### GET /api/communities
Obtener todas las comunidades con conteo de miembros y eventos.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Comunidad Tech Lima",
    "_count": {
      "members": 45,
      "events": 12,
      "requests": 3
    }
  }
]
```

---

### GET /api/communities/:id
Obtener una comunidad específica con miembros y eventos.

**Response:**
```json
{
  "id": 1,
  "name": "Comunidad Tech Lima",
  "members": [
    {
      "userId": 1,
      "role": "ADMIN",
      "createdAt": "2025-01-15T10:00:00Z",
      "user": {
        "id": 1,
        "name": "Juan",
        "lastName": "Pérez",
        "email": "juan@example.com",
        "image": "https://..."
      }
    }
  ],
  "events": [
    {
      "id": 1,
      "name": "Meetup JavaScript",
      "description": "...",
      "timeBegin": "2025-02-01T19:00:00Z",
      "place": {
        "name": "WeWork",
        "city": "Lima",
        "country": "Perú"
      }
    }
  ],
  "_count": {
    "requests": 3
  }
}
```

---

### POST /api/communities
Crear nueva comunidad.

**Request Body:**
```json
{
  "name": "Comunidad Tech Lima"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "Comunidad Tech Lima"
}
```

---

### PUT /api/communities/:id
Actualizar comunidad.

**Request Body:**
```json
{
  "name": "Comunidad Tech Lima - Actualizado"
}
```

**Response:** `200 OK`

---

### DELETE /api/communities/:id
Eliminar comunidad.

**Response:** `204 No Content`

---

## 👥 Miembros de Comunidad

### GET /api/communities/:id/members
Obtener miembros de una comunidad.

**Response:**
```json
[
  {
    "userId": 1,
    "communityId": 1,
    "role": "ADMIN",
    "createdAt": "2025-01-15T10:00:00Z",
    "exitAt": null,
    "user": {
      "id": 1,
      "name": "Juan",
      "lastName": "Pérez",
      "email": "juan@example.com",
      "image": "https://...",
      "membership": "VIP"
    }
  }
]
```

---

### POST /api/communities/:id/members
Agregar miembro a comunidad (solo admins).

**Request Body:**
```json
{
  "userId": 5,
  "role": "CLIENT"
}
```

**Roles disponibles:** `CLIENT`, `MARKET`, `ADMIN`

**Response:** `201 Created`
```json
{
  "userId": 5,
  "communityId": 1,
  "role": "CLIENT",
  "createdAt": "2025-01-20T14:30:00Z",
  "user": {
    "id": 5,
    "name": "María",
    "lastName": "García",
    "email": "maria@example.com"
  },
  "community": {
    "id": 1,
    "name": "Comunidad Tech Lima"
  }
}
```

**Errores:**
- `404`: Community not found / User not found
- `409`: User is already a member of this community

---

### DELETE /api/communities/:id/members/:userId
Remover miembro de comunidad.

**Response:** `204 No Content`

---

## 📝 Solicitudes (Requests)

### GET /api/requests
Obtener todas las solicitudes (con filtros opcionales).

**Query Parameters:**
- `userId` - Filtrar por usuario que solicita
- `status` - Filtrar por estado: `PENDING`, `ACCEPTED`, `REJECTED`

**Ejemplo:** `GET /api/requests?userId=5&status=PENDING`

**Response:**
```json
[
  {
    "id": 1,
    "fromId": 5,
    "communityId": 1,
    "status": "PENDING",
    "createdAt": "2025-01-20T10:00:00Z",
    "acceptedById": null,
    "from": {
      "id": 5,
      "name": "María",
      "lastName": "García",
      "email": "maria@example.com",
      "image": "https://..."
    },
    "community": {
      "id": 1,
      "name": "Comunidad Tech Lima"
    },
    "acceptedBy": null
  }
]
```

---

### GET /api/requests/:id
Obtener solicitud específica.

**Response:** Similar al GET /api/requests

---

### GET /api/communities/:id/requests
Obtener solicitudes de una comunidad específica.

**Response:** Array de solicitudes (mismo formato que GET /api/requests)

---

### POST /api/communities/:id/requests
Crear solicitud de ingreso a comunidad.

**Request Body:**
```json
{
  "fromId": 5
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "fromId": 5,
  "communityId": 1,
  "status": "PENDING",
  "createdAt": "2025-01-20T10:00:00Z",
  "from": {
    "id": 5,
    "name": "María",
    "lastName": "García",
    "email": "maria@example.com"
  },
  "community": {
    "id": 1,
    "name": "Comunidad Tech Lima"
  }
}
```

**Errores:**
- `404`: Community not found / User not found
- `409`: User is already a member / Request already exists

---

### PATCH /api/requests/:id
Aceptar o rechazar solicitud.

**Request Body:**
```json
{
  "status": "ACCEPTED",
  "acceptedById": 1
}
```

**Estados disponibles:** `ACCEPTED`, `REJECTED`

**Comportamiento:**
- Si `status = ACCEPTED`: Se crea automáticamente el miembro en la comunidad con role `CLIENT`
- Si `status = REJECTED`: Solo se actualiza el estado

**Response:** `200 OK`
```json
{
  "id": 1,
  "status": "ACCEPTED",
  "acceptedById": 1,
  "acceptedBy": {
    "id": 1,
    "name": "Juan",
    "lastName": "Pérez"
  }
}
```

**Errores:**
- `400`: Request already accepted/rejected
- `404`: Request not found
- `409`: User is already a member (solo en ACCEPTED)

---

### DELETE /api/requests/:id
Cancelar/eliminar solicitud.

**Response:** `204 No Content`

---

## 💌 Invitaciones

### GET /api/invitations
Obtener todas las invitaciones (con filtros opcionales).

**Query Parameters:**
- `fromId` - Filtrar por quien envía
- `toId` - Filtrar por quien recibe
- `status` - Filtrar por estado: `PENDING`, `ACCEPTED`, `REJECTED`

**Ejemplo:** `GET /api/invitations?toId=5&status=PENDING`

**Response:**
```json
[
  {
    "id": 1,
    "fromId": 1,
    "toId": 5,
    "placeId": 1,
    "eventId": 2,
    "status": "PENDING",
    "invitationDate": "2025-02-01T19:00:00Z",
    "createdAt": "2025-01-20T14:00:00Z",
    "from": {
      "id": 1,
      "name": "Juan",
      "lastName": "Pérez",
      "email": "juan@example.com",
      "image": "https://..."
    },
    "to": {
      "id": 5,
      "name": "María",
      "lastName": "García",
      "email": "maria@example.com",
      "image": "https://..."
    },
    "place": {
      "id": 1,
      "name": "WeWork San Isidro",
      "direction": "Av. Principal 123",
      "city": "Lima",
      "country": "Perú",
      "type": "coworking"
    },
    "event": {
      "id": 2,
      "name": "Meetup JavaScript",
      "description": "...",
      "timeBegin": "2025-02-01T19:00:00Z",
      "timeEnd": "2025-02-01T22:00:00Z",
      "status": "proximo"
    }
  }
]
```

---

### GET /api/invitations/:id
Obtener invitación específica con todos los detalles.

**Response:** Similar al GET /api/invitations pero con más detalles (mapUrl, minAge, etc.)

---

### POST /api/invitations
Crear nueva invitación.

**Request Body:**
```json
{
  "fromId": 1,
  "toId": 5,
  "placeId": 1,
  "eventId": 2,
  "invitationDate": "2025-02-01T19:00:00Z"
}
```

**Campos:**
- `fromId` (required): Usuario que envía la invitación
- `toId` (required): Usuario que recibe la invitación
- `placeId` (required): Lugar de la invitación
- `eventId` (optional): Evento específico (si aplica)
- `invitationDate` (optional): Fecha/hora de la invitación

**Response:** `201 Created`

**Errores:**
- `404`: Sender/Recipient user not found, Place not found, Event not found

---

### PATCH /api/invitations/:id/status
Aceptar o rechazar invitación.

**Request Body:**
```json
{
  "status": "ACCEPTED"
}
```

**Estados disponibles:** `ACCEPTED`, `REJECTED`

**Response:** `200 OK`

**Errores:**
- `400`: Invitation already accepted/rejected
- `404`: Invitation not found

---

### DELETE /api/invitations/:id
Cancelar/eliminar invitación.

**Response:** `204 No Content`

---

## 🎫 Tickets (Compras)

### GET /api/tickets/bought
Obtener tickets comprados (con filtros opcionales).

**Query Parameters:**
- `userId` - Filtrar por usuario
- `eventId` - Filtrar por evento

**Ejemplo:** `GET /api/tickets/bought?userId=5`

**Response:**
```json
[
  {
    "id": 1,
    "userId": 5,
    "ticketId": 10,
    "price": "25.00",
    "createdAt": "2025-01-20T15:30:00Z",
    "user": {
      "id": 5,
      "name": "María",
      "lastName": "García",
      "email": "maria@example.com"
    },
    "ticket": {
      "id": 10,
      "type": "VIP",
      "price": "25.00",
      "quantity": 45,
      "description": "Acceso VIP al evento",
      "event": {
        "id": 2,
        "name": "Meetup JavaScript",
        "description": "...",
        "timeBegin": "2025-02-01T19:00:00Z",
        "status": "proximo",
        "place": {
          "name": "WeWork San Isidro",
          "city": "Lima",
          "country": "Perú",
          "direction": "Av. Principal 123"
        }
      }
    }
  }
]
```

---

### GET /api/tickets/bought/:id
Obtener ticket comprado específico con todos los detalles.

**Response:** Similar a GET /api/tickets/bought pero con más información (membership, minAge, mapUrl, etc.)

---

### POST /api/tickets/buy
Comprar ticket(s).

**Request Body:**
```json
{
  "userId": 5,
  "ticketId": 10,
  "quantity": 2
}
```

**Campos:**
- `userId` (required): ID del usuario que compra
- `ticketId` (required): ID del ticket a comprar
- `quantity` (optional, default: 1): Cantidad de tickets

**Validaciones:**
- Evento no debe estar finalizado/cancelado
- Debe haber suficientes tickets disponibles
- Se reduce la cantidad disponible automáticamente

**Response:** `201 Created`
```json
{
  "message": "Successfully purchased 2 ticket(s)",
  "tickets": [
    {
      "id": 1,
      "userId": 5,
      "ticketId": 10,
      "price": "25.00",
      "createdAt": "2025-01-20T15:30:00Z",
      "user": { ... },
      "ticket": { ... }
    },
    {
      "id": 2,
      "userId": 5,
      "ticketId": 10,
      "price": "25.00",
      "createdAt": "2025-01-20T15:30:00Z",
      "user": { ... },
      "ticket": { ... }
    }
  ],
  "total": 50.00
}
```

**Errores:**
- `404`: User not found / Ticket not found
- `400`: Cannot buy tickets for finalizado/cancelado event
- `400`: Not enough tickets available. Only X left.

---

### DELETE /api/tickets/bought/:id
Cancelar/reembolsar ticket comprado.

**Validaciones:**
- Solo se puede cancelar si el evento no ha empezado
- Se restaura automáticamente la cantidad disponible

**Response:** `204 No Content`

**Errores:**
- `404`: Bought ticket not found
- `400`: Cannot refund ticket for past or ongoing event

---

## 📊 Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado exitosamente |
| 204 | No Content - Operación exitosa sin respuesta |
| 400 | Bad Request - Validación fallida o datos inválidos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: ya existe) |
| 500 | Internal Server Error - Error del servidor |

---

## 🔐 Notas de Seguridad

⚠️ **TODO para producción:**

1. **Autenticación**: Implementar JWT/OAuth para proteger endpoints
2. **Autorización**: Verificar roles antes de permitir operaciones (ej: solo admins pueden agregar miembros)
3. **Rate Limiting**: Limitar peticiones por IP/usuario
4. **Validación de ownership**: Verificar que el usuario tenga permiso para modificar recursos

**Ejemplo de middleware de auth (pendiente):**
```typescript
// Solo admins pueden agregar miembros
router.post('/:id/members', authMiddleware, adminOnly, async (req, res) => {
  // ...
});
```

---

## 🧪 Testing con cURL

### Crear comunidad
```bash
curl -X POST http://localhost:3000/api/communities \
  -H "Content-Type: application/json" \
  -d '{"name": "Comunidad Tech Lima"}'
```

### Solicitar ingreso
```bash
curl -X POST http://localhost:3000/api/communities/1/requests \
  -H "Content-Type: application/json" \
  -d '{"fromId": 5}'
```

### Aceptar solicitud
```bash
curl -X PATCH http://localhost:3000/api/requests/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "ACCEPTED", "acceptedById": 1}'
```

### Crear invitación
```bash
curl -X POST http://localhost:3000/api/invitations \
  -H "Content-Type: application/json" \
  -d '{
    "fromId": 1,
    "toId": 5,
    "placeId": 1,
    "eventId": 2,
    "invitationDate": "2025-02-01T19:00:00Z"
  }'
```

### Comprar tickets
```bash
curl -X POST http://localhost:3000/api/tickets/buy \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 5,
    "ticketId": 10,
    "quantity": 2
  }'
```

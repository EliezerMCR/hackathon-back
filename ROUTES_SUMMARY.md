# 🗺️ Mapa de Rutas - Hackathon Backend

## 📡 Endpoints Disponibles

### 🏥 Health Check
```
GET    /health                          → Server status
```

---

### 👤 Users
```
GET    /api/users                       → List all users
GET    /api/users/:id                   → Get user by ID (with events & tickets)
POST   /api/users                       → Create new user
PUT    /api/users/:id                   → Update user
DELETE /api/users/:id                   → Delete user
```

---

### 🏘️ Communities
```
GET    /api/communities                 → List all communities (with counts)
GET    /api/communities/:id             → Get community (with members & events)
POST   /api/communities                 → Create community
PUT    /api/communities/:id             → Update community
DELETE /api/communities/:id             → Delete community
```

---

### 👥 Community Members
```
GET    /api/communities/:id/members     → List community members
POST   /api/communities/:id/members     → Add member (admin only)
DELETE /api/communities/:id/members/:userId  → Remove member
```

---

### 📝 Community Requests
```
GET    /api/communities/:id/requests    → Get requests for community
POST   /api/communities/:id/requests    → Create join request
```

---

### 📋 Requests (Global)
```
GET    /api/requests                    → List all requests (filters: userId, status)
GET    /api/requests/:id                → Get request by ID
PATCH  /api/requests/:id                → Accept/Reject request
DELETE /api/requests/:id                → Cancel request
```

---

### �� Invitations
```
GET    /api/invitations                 → List invitations (filters: fromId, toId, status)
GET    /api/invitations/:id             → Get invitation by ID
POST   /api/invitations                 → Create invitation
PATCH  /api/invitations/:id/status      → Accept/Reject invitation
DELETE /api/invitations/:id             → Cancel invitation
```

---

### 🎫 Tickets
```
GET    /api/tickets/bought              → List bought tickets (filters: userId, eventId)
GET    /api/tickets/bought/:id          → Get bought ticket by ID
POST   /api/tickets/buy                 → Buy ticket(s)
DELETE /api/tickets/bought/:id          → Refund ticket (before event only)
```

---

## 📊 Resumen por Método HTTP

| Método | Count | Uso |
|--------|-------|-----|
| GET | 13 | Obtener recursos |
| POST | 5 | Crear recursos |
| PUT | 2 | Actualizar recursos completos |
| PATCH | 2 | Actualizar parcialmente (status) |
| DELETE | 6 | Eliminar recursos |
| **TOTAL** | **28** | **endpoints** |

---

## 🎯 Rutas por Categoría

### CRUD Completo (5)
✅ Users
✅ Communities

### CRUD Parcial (4)
✅ Community Members (no update)
✅ Requests (no update, solo PATCH status)
✅ Invitations (no update, solo PATCH status)
✅ Tickets (no update, solo refund/delete)

---

## 🔐 Seguridad (Pendiente)

⚠️ **Actualmente sin autenticación**

Rutas que deberían protegerse:
- `POST /api/communities/:id/members` → Solo ADMIN
- `PATCH /api/requests/:id` → Solo ADMIN de la comunidad
- `POST /api/tickets/buy` → Solo usuario autenticado
- `DELETE /api/users/:id` → Solo el propio usuario o ADMIN

---

## 🧪 Test Rápido

```bash
# Health check
curl http://localhost:3000/health

# Crear comunidad
curl -X POST http://localhost:3000/api/communities \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Community"}'

# Listar comunidades
curl http://localhost:3000/api/communities

# Comprar tickets
curl -X POST http://localhost:3000/api/tickets/buy \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"ticketId":1,"quantity":2}'
```

---

**Total de rutas:** 28 endpoints funcionales ✅

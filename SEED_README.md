# 🌱 Database Seed Script

## 📋 Descripción

Script para poblar la base de datos con datos de prueba realistas.

## 🎯 Datos que se crean

### 👤 Usuarios (5)
- **1 Admin**: Juan Carlos Administrador (VIP)
- **1 Market**: María Promotora (VIP)
- **3 Clients**: Pedro, Ana (VIP), Luis (Normal)

### 📍 Lugares (3)
- WeWork San Isidro (coworking, 200 personas)
- Barranco Beer Company (bar, 150 personas)
- Centro Cultural PUCP (cultural, 300 personas)

### 🏘️ Comunidades (3)
- Tech Lima Community
- Startup Perú
- Developers Circle

### 👥 Miembros
- 5 membresías distribuidas en las comunidades

### 🎉 Eventos (3)
- Meetup JavaScript 2025 (Feb 15)
- Startup Weekend Lima (Mar 20-22)
- After Office Tech (Feb 1)

### 🎫 Tickets (5)
- Meetup JS: General (gratis) + VIP (S/25)
- Startup Weekend: Early Bird (S/50) + Regular (S/80)
- After Office: General (S/15)

### 💳 Compras
- 3 tickets ya comprados por diferentes usuarios

### 📋 Solicitudes
- 1 solicitud pendiente
- 1 solicitud aceptada

### 💌 Invitaciones
- 1 invitación pendiente
- 1 invitación aceptada

### ⭐ Reviews
- 2 reviews de lugares/eventos

---

## 🚀 Cómo Ejecutar

### Opción 1: Comando npm
```bash
npm run db:seed
```

### Opción 2: Directamente con tsx
```bash
npx tsx prisma/seed.ts
```

### Opción 3: Desde el código compilado
```bash
npm run build
node dist/prisma/seed.js
```

---

## ⚠️ Advertencias

### 🗑️ Limpieza de Datos

El script **elimina todos los datos existentes** antes de crear los nuevos. 

Si quieres conservar datos existentes, comenta las líneas de `deleteMany` en el archivo `prisma/seed.ts`:

```typescript
// Comentar estas líneas para NO borrar datos existentes
// await prisma.bought_Ticket.deleteMany();
// await prisma.promotion.deleteMany();
// ... etc
```

### 🔐 Seguridad

⚠️ Las contraseñas están en **texto plano** para fines de desarrollo.

En producción, usa bcrypt:
```typescript
import bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash('password123', 10);
```

---

## 📝 Credenciales de Prueba

| Role | Email | Password | Membership |
|------|-------|----------|------------|
| ADMIN | admin@hackathon.com | admin123 | VIP |
| MARKET | maria@market.com | market123 | VIP |
| CLIENT | pedro@gmail.com | client123 | NORMAL |
| CLIENT | ana@gmail.com | client123 | VIP |
| CLIENT | luis@gmail.com | client123 | NORMAL |

---

## 🧪 Escenarios de Prueba

### 1. Flujo de Comunidades

```bash
# Ver comunidades
GET /api/communities

# Ver miembros de Tech Lima (ID: 1)
GET /api/communities/1/members

# Ver solicitudes pendientes
GET /api/requests?status=PENDING

# Aceptar solicitud de Luis (ID: 1)
PATCH /api/requests/1
{
  "status": "ACCEPTED",
  "acceptedById": 1
}
```

### 2. Flujo de Tickets

```bash
# Ver eventos disponibles
GET /api/events

# Ver tickets del Meetup JS
GET /api/tickets?eventId=1

# Comprar ticket como Pedro (userId: 3)
POST /api/tickets/buy
{
  "userId": 3,
  "ticketId": 1,
  "quantity": 1
}

# Ver mis tickets comprados
GET /api/tickets/bought?userId=3
```

### 3. Flujo de Invitaciones

```bash
# Ver invitaciones pendientes para Luis (toId: 5)
GET /api/invitations?toId=5&status=PENDING

# Aceptar invitación
PATCH /api/invitations/1/status
{
  "status": "ACCEPTED"
}
```

---

## 🔄 Re-Seeding

Si quieres resetear y volver a popular la base de datos:

```bash
# Limpiar y re-seed
npm run db:seed
```

O si prefieres usar migraciones:

```bash
# Reset completo (borra BD y corre migraciones)
npm run db:reset

# Luego seed
npm run db:seed
```

---

## 📊 Verificación

Después de correr el seed, puedes verificar con:

### Prisma Studio
```bash
npm run db:studio
```

### Queries directas
```bash
# Contar usuarios
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";"

# Contar eventos
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Event\";"
```

### API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Ver usuarios
curl http://localhost:3000/api/users

# Ver comunidades
curl http://localhost:3000/api/communities

# Ver eventos (requiere implementar endpoint)
curl http://localhost:3000/api/events
```

---

## 🛠️ Personalización

### Agregar más datos

Edita `prisma/seed.ts` y agrega más entradas en las secciones correspondientes:

```typescript
// Ejemplo: Agregar más usuarios
const newUser = await prisma.user.create({
  data: {
    name: 'Carlos',
    lastName: 'Nuevo',
    email: 'carlos@example.com',
    password: 'password123',
    birthDate: new Date('1995-01-01'),
    city: 'Lima',
    country: 'Perú',
    gender: 'MAN',
    role: 'CLIENT',
    membership: 'NORMAL',
    documentId: 99999999,
  },
});
```

### Cambiar imágenes

Las imágenes usan servicios públicos:
- `https://i.pravatar.cc/150?img=X` - Avatares
- `https://images.unsplash.com/photo-...` - Fotos de lugares

Puedes reemplazarlos con tus propias URLs.

---

## 🐛 Troubleshooting

### Error: "Database not found"
```bash
# Asegúrate de que la BD existe
npm run db:push
```

### Error: "Foreign key constraint"
```bash
# El seed limpia datos en orden correcto
# Si hay error, revisa las relaciones en schema.prisma
```

### Error: "Module not found"
```bash
# Reinstala dependencias
npm install
```

### Error: "Cannot find prisma client"
```bash
# Regenera el cliente
npm run db:generate
```

---

## 📖 Recursos

- [Prisma Seeding Guide](https://www.prisma.io/docs/guides/database/seed-database)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

---

**Última actualización:** 17 de Octubre, 2025  
**Versión:** 1.0.0

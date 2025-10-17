# Hackathon Backend

Backend API desarrollado con TypeScript, Express, Prisma y PostgreSQL (Neon).

## 🚀 Características

- **Express.js** con TypeScript
- **Prisma ORM** para base de datos
- **PostgreSQL** con Neon Database
- **Zod** para validación de datos
- **CORS** y **Helmet** para seguridad
- Endpoints CRUD para Users y Posts
- Deploy automático en **Vercel**

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone <repo-url>
cd hackathon-back
```

2. Instala dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
# Edita .env con tu URL de base de datos de Neon
```

4. Genera el cliente de Prisma:
```bash
npm run db:generate
```

5. Ejecuta las migraciones:
```bash
npm run db:push
```

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo con hot-reload
- `npm run build` - Compilar TypeScript a JavaScript
- `npm start` - Ejecutar servidor en producción
- `npm run lint` - Linter de código
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:push` - Aplicar cambios del schema a la BD
- `npm run db:migrate` - Crear nueva migración
- `npm run db:studio` - Abrir Prisma Studio

## 📚 API Endpoints

### Health Check
- `GET /health` - Estado del servidor

### Users
- `GET /api/users` - Listar todos los usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `POST /api/users` - Crear nuevo usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Posts
- `GET /api/posts` - Listar todos los posts
- `GET /api/posts/:id` - Obtener post por ID
- `POST /api/posts` - Crear nuevo post
- `PUT /api/posts/:id` - Actualizar post
- `DELETE /api/posts/:id` - Eliminar post

## 🌐 Deploy en Vercel

1. Conecta tu repositorio con Vercel
2. Configura las variables de entorno en Vercel:
   - `DATABASE_URL` - Tu URL de conexión a Neon
3. Deploy automático en cada push a main

## 🛠️ Tecnologías

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Prisma** - ORM y migración de DB
- **PostgreSQL** - Base de datos (Neon)
- **Zod** - Validación de esquemas
- **ESLint** - Linting de código

## 📝 Estructura del Proyecto

```
src/
├── index.ts          # Punto de entrada principal
├── routes/           # Rutas de la API
│   ├── users.ts      # Endpoints de usuarios
│   └── posts.ts      # Endpoints de posts
├── middlewares/      # Middlewares personalizados
└── utils/           # Utilidades y helpers
```

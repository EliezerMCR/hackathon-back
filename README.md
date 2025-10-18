# Hackathon Backend API

Backend API desarrollado con TypeScript, Express, Prisma ORM y PostgreSQL (Neon).

## 🚀 Stack Tecnológico

- **Runtime**: Node.js >=18
- **Framework**: Express 4.21
- **Base de datos**: PostgreSQL (Neon)
- **ORM**: Prisma 6.17
- **Validación**: Zod 3.24
- **TypeScript**: 5.7
- **Seguridad**: Helmet, CORS
- **Deploy**: Vercel Serverless

## 📋 Requisitos Previos

- Node.js >= 18
- npm >= 9.0.0
- Una base de datos PostgreSQL (recomendado: Neon)

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd hackathon-back

# Instalar dependencias
npm install

git clone <repository-url>```

cd hackathon-back

3. Configura las variables de entorno:

# Instalar dependencias```bash

npm installcp .env.example .env

# Edita .env con tu URL de base de datos de Neon

# Configurar variables de entorno```

cp .env.example .env

# Editar .env y agregar tu DATABASE_URL de Neon4. Genera el cliente de Prisma:

``````bash

npm run db:generate

## 🔧 Configuración```



### Variables de Entorno5. Ejecuta las migraciones:

```bash

Crea un archivo `.env` en la raíz del proyecto:npm run db:push

```

```env

DATABASE_URL="postgresql://user:password@host/database?sslmode=require"## 🔧 Scripts Disponibles

PORT=3000

NODE_ENV=development- `npm run dev` - Servidor de desarrollo con hot-reload

```- `npm run build` - Compilar TypeScript a JavaScript

- `npm start` - Ejecutar servidor en producción

### Base de Datos- `npm run lint` - Linter de código

- `npm run db:generate` - Generar cliente Prisma

```bash- `npm run db:push` - Aplicar cambios del schema a la BD

# Generar Prisma Client- `npm run db:migrate` - Crear nueva migración

npm run db:generate- `npm run db:studio` - Abrir Prisma Studio



# Aplicar migraciones (desarrollo)## 📚 API Endpoints

npm run db:migrate

### Health Check

# Sincronizar schema sin migraciones- `GET /health` - Estado del servidor

npm run db:push

### Users

# Abrir Prisma Studio (GUI para la BD)- `GET /api/users` - Listar todos los usuarios

npm run db:studio- `GET /api/users/:id` - Obtener usuario por ID

```- `POST /api/users` - Crear nuevo usuario

- `PUT /api/users/:id` - Actualizar usuario

## 🏃‍♂️ Ejecución- `DELETE /api/users/:id` - Eliminar usuario



### Desarrollo### Posts

- `GET /api/posts` - Listar todos los posts

```bash- `GET /api/posts/:id` - Obtener post por ID

npm run dev- `POST /api/posts` - Crear nuevo post

```- `PUT /api/posts/:id` - Actualizar post

- `DELETE /api/posts/:id` - Eliminar post

El servidor se iniciará en `http://localhost:3000` con hot-reload.

## 🌐 Deploy en Vercel

### Producción

1. Conecta tu repositorio con Vercel

```bash2. Configura las variables de entorno en Vercel:

# Build   - `DATABASE_URL` - Tu URL de conexión a Neon

npm run build3. Deploy automático en cada push a main



# Start## 🛠️ Tecnologías

npm start

```- **Node.js** + **TypeScript**

- **Express.js** - Framework web

## 📡 Endpoints Disponibles- **Prisma** - ORM y migración de DB

- **PostgreSQL** - Base de datos (Neon)

### Health Check- **Zod** - Validación de esquemas

- **ESLint** - Linting de código

- **GET** `/health` - Verifica el estado del servidor

## 📝 Estructura del Proyecto

### Users API

```

- **GET** `/api/users` - Obtener todos los usuariossrc/

- **GET** `/api/users/:id` - Obtener usuario por ID├── index.ts          # Punto de entrada principal

- **POST** `/api/users` - Crear nuevo usuario├── routes/           # Rutas de la API

- **PUT** `/api/users/:id` - Actualizar usuario│   ├── users.ts      # Endpoints de usuarios

- **DELETE** `/api/users/:id` - Eliminar usuario│   └── posts.ts      # Endpoints de posts

├── middlewares/      # Middlewares personalizados

### Ejemplo de Creación de Usuario└── utils/           # Utilidades y helpers

```

```json
POST /api/users
Content-Type: application/json

{
  "name": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "password": "securepassword123",
  "birthDate": "1990-01-15",
  "city": "Lima",
  "country": "Perú",
  "gender": "MAN",
  "role": "CLIENT",
  "membership": "NORMAL",
  "documentId": 12345678,
  "image": "https://example.com/profile.jpg"
}
```

## 🚢 Deploy en Vercel

### Configuración

El proyecto está optimizado para deploy en Vercel con el nuevo formato (sin `builds`):

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
```

### Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings > Environment Variables
3. Agrega: `DATABASE_URL` con tu connection string de Neon

### Deploy

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

## 🧪 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo con hot-reload |
| `npm run build` | Compila TypeScript y genera Prisma Client |
| `npm start` | Inicia servidor de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm run db:generate` | Genera Prisma Client |
| `npm run db:push` | Sincroniza schema con BD |
| `npm run db:migrate` | Crea y aplica migraciones |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run clean` | Limpia node_modules y dist |
| `npm run reinstall` | Limpia y reinstala dependencias |

## 🔐 Seguridad

- ⚠️ **IMPORTANTE**: El password se guarda en texto plano. En producción, usa bcrypt:

```bash
npm install bcrypt @types/bcrypt
```

```typescript
import bcrypt from 'bcrypt';

// Al crear usuario
const hashedPassword = await bcrypt.hash(password, 10);

// Al validar
const isValid = await bcrypt.compare(password, user.password);
```

## 📦 Estructura del Proyecto

```
hackathon-back/
├── api/
│   └── index.ts          # Entry point para Vercel
├── src/
│   ├── index.ts          # Entry point para desarrollo
│   └── routes/
│       └── users.ts      # Rutas de usuarios
├── prisma/
│   └── schema.prisma     # Schema de la base de datos
├── dist/                 # Build output (TypeScript compilado)
├── package.json
├── tsconfig.json
├── vercel.json           # Configuración de Vercel
└── .env                  # Variables de entorno (no commiteado)
```

## 🐛 Solución de Problemas

### Error: Prisma Client not generated

```bash
npm run db:generate
```

### Advertencias de dependencias obsoletas

```bash
npm dedupe
npm audit fix
```

### Error de conexión a la base de datos

- Verifica que tu `DATABASE_URL` en `.env` sea correcta
- Asegúrate de que la base de datos esté accesible
- Para Neon, usa `?sslmode=require` al final de la URL

## 🔄 Cambios Recientes

### ✅ Optimizaciones Implementadas

1. **Vercel Config Modernizado**
   - ❌ Removido: `builds` (obsoleto)
   - ✅ Nuevo: `rewrites` (formato actual)
   - Simplifica el deploy y mejora el rendimiento

2. **Dependencias Actualizadas**
   - Express: 4.18.2 → 4.21.2
   - TypeScript: 5.3.0 → 5.7.2
   - ESLint: 8.56.0 → 9.18.0
   - Helmet: 7.1.0 → 8.0.0
   - Todas las dependencias @types actualizadas

3. **Scripts Optimizados**
   - `build`: Ahora incluye `prisma generate` automáticamente
   - `postinstall`: Genera Prisma Client post-instalación
   - `vercel-build`: Script específico para Vercel con migraciones

4. **Engines Definidos**
   - Node.js: >=18 (compatible con Node 18-24+)
   - npm: >=9.0.0

### Por qué ahora el build es estable y moderno

✅ **Sin dependencias obsoletas**: Todas actualizadas a versiones LTS  
✅ **0 vulnerabilidades**: Confirmado con `npm audit`  
✅ **Árbol optimizado**: `npm dedupe` ejecutado  
✅ **Formato Vercel moderno**: Sin `builds`, usa `rewrites`  
✅ **Prisma auto-generado**: En build y postinstall  
✅ **TypeScript strict**: Errores capturados en tiempo de compilación  

## 📄 Licencia

MIT

## 👥 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

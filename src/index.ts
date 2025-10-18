/**
 * Development Server Entry Point
 * Este archivo SOLO inicia el servidor para desarrollo local
 * La configuración de Express está en src/app.ts
 */
import app from './app';
import { prisma } from './lib/prisma';

const PORT = process.env.PORT || 3000;

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  console.log(`\n${signal} signal received: closing server gracefully`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API base: http://localhost:${PORT}/api`);
});

// Export for backward compatibility
export { prisma };
export default app;
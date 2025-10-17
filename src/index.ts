import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import { authenticate, authorize } from './middlewares/auth';
import { errorHandler } from './middlewares/errorHandler';
import { HTTP404Error } from './utils/errors';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma
export const prisma = new PrismaClient();

// Middlewares
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// Protected route example
app.get('/api/protected', authenticate, authorize(['ADMIN']), (req, res) => {
  res.json({ message: 'This is a protected route for admins only' });
});

// 404 handler
app.use('*', (req, res, next) => {
  next(new HTTP404Error('Route not found'));
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
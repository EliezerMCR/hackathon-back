/**
 * Express Application Configuration
 * Este es el ÚNICO archivo que configura la aplicación Express
 * Tanto desarrollo local (src/index.ts) como Vercel (api/index.ts) importan de aquí
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import routes
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import placeRoutes from './routes/places';
import productRoutes from './routes/products';
import eventRoutes from './routes/events';
import communityRoutes from './routes/communities';
import requestRoutes from './routes/requests';
import invitationRoutes from './routes/invitations';
import ticketRoutes from './routes/tickets';
import promotionRoutes from './routes/promotions';
import adRoutes from './routes/ads';
import reviewRoutes from './routes/reviews';
import { authenticate, authorize } from './middlewares/auth';
import { errorHandler } from './middlewares/errorHandler';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

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

app.get('/api', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/reviews', reviewRoutes);

// Protected route example
app.get('/api/protected', authenticate, authorize(['ADMIN']), (req, res) => {
  res.json({ message: 'This is a protected route for admins only' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'NOT_FOUND',
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use(errorHandler);

// Export app (sin iniciar el servidor)
export default app;

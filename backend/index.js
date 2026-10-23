import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './config/db.js';
import { initRedis } from './config/redis.js';
import { setupDatabase } from './db/init.js';
import { startHoldExpirationWorker } from './workers/holdExpirationWorker.js';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import reservationRoutes from './routes/reservations.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import analyticsRoutes from './routes/analytics.js';
import testRoutes from './routes/test.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Tenant-Slug', 'X-Tenant-ID']
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/api/reservations/hold/') && !req.url.startsWith('/api/test/health')) {
      console.log(`[API] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/test', testRoutes);

// Root route for sanity check
app.get('/api', (req, res) => {
  res.json({
    name: 'Multi-Tenant Event & Ticket Reservation System API',
    version: '1.0.0',
    documentation: '/docs',
    health: '/api/test/health'
  });
});

// Serve frontend in production if built
const frontendDist = path.resolve(__dirname, '../frontend/dist');
const fallbackClientDist = path.resolve(__dirname, '../client/dist');
const staticDist = fs.existsSync(frontendDist) ? frontendDist : fallbackClientDist;

app.use(express.static(staticDist));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.url.startsWith('/api')) {
    return res.sendFile(path.resolve(staticDist, 'index.html'), (err) => {
      if (err) next();
    });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred'
  });
});

// Server Initialization
async function bootstrap() {
  try {
    console.log('\n======================================================');
    console.log('🚀 Starting Multi-Tenant Event & Ticket Reservation System');
    console.log('======================================================');

    // 1. Initialize Database & Schema
    await setupDatabase();

    // 2. Initialize Redis / In-Memory Cache
    await initRedis();

    // 3. Start Background Hold Expiration Worker (Runs every 10s)
    startHoldExpirationWorker(10000);

    // 4. Start HTTP Server
    app.listen(PORT, () => {
      console.log(`\n\x1b[32m✔ Server running successfully on http://localhost:${PORT}\x1b[0m`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/test/health`);
      console.log(`⚡ Concurrency Lab: http://localhost:${PORT}/api/test/concurrency\n`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();

import { Router } from 'express';
import { concurrencyController } from '../controllers/concurrencyController.js';
import { getDbMode } from '../config/db.js';
import { getRedisMode } from '../config/redis.js';

const router = Router();

// Concurrency stress test endpoint
router.post('/concurrency', concurrencyController.runConcurrencyTest);

// System health and architecture diagnostics
router.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'Multi-Tenant Event & Ticket Reservation System',
    timestamp: new Date().toISOString(),
    database: {
      mode: getDbMode(),
      concurrencyControl: getDbMode() === 'postgresql' ? 'PostgreSQL 17 Row-Level Locks (SELECT FOR UPDATE)' : 'SQLite WAL (Immediate Atomic Transactions)'
    },
    cachingLayer: {
      mode: getRedisMode(),
      engine: getRedisMode() === 'redis' ? 'Distributed Redis Cache' : 'In-Memory High-Performance TTL Cache'
    },
    backgroundJobs: {
      status: 'ACTIVE',
      job: 'Hold Expiration Worker (Runs every 10 seconds)'
    }
  });
});

export default router;

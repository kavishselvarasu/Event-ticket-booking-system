import { Router } from 'express';
import { reservationController } from '../controllers/reservationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Create 10-minute hold
router.post('/hold', reservationController.createHold);

// Check hold countdown / status
router.get('/hold/:id', reservationController.getHold);

// Manually cancel hold early
router.delete('/hold/:id', reservationController.cancelHold);

export default router;

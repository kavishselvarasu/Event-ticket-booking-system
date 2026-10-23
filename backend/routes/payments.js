import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';

const router = Router();

// Mock payment gateway endpoint
router.post('/simulate', paymentController.simulate);

export default router;

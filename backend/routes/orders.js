import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Checkout and finalize order
router.post('/checkout', orderController.checkout);

// View attendee's orders and tickets
router.get('/my-tickets', orderController.getMyTickets);

// View single order by ID or order number
router.get('/:id', orderController.getOrder);

export default router;

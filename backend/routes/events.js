import { Router } from 'express';
import { eventController } from '../controllers/eventController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { resolveTenant } from '../middleware/tenant.js';

const router = Router();

router.use(resolveTenant);

router.get('/tenants', eventController.getTenants);
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);

// Organizers and Admins can create and manage events
router.post('/', authenticate, requireRole(['organizer', 'admin']), eventController.createEvent);

export default router;

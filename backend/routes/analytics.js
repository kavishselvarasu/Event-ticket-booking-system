import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { resolveTenant } from '../middleware/tenant.js';

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

// Organizer dashboard analytics
router.get('/organizer', requireRole(['organizer', 'admin']), analyticsController.getOrganizerAnalytics);

// Platform super admin analytics
router.get('/admin', requireRole('admin'), analyticsController.getAdminPlatformAnalytics);

export default router;

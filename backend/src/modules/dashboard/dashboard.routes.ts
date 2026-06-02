import { Router } from 'express';
import { getDashboardStats } from './dashboard.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';

const router = Router();

// Dashboard aggregates: Admin-only
router.get('/', requireAuth, requireRole(['Admin']), getDashboardStats);

export default router;

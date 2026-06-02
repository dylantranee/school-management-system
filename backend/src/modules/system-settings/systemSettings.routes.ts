import { Router } from 'express';
import { listSettings, updateSetting } from './systemSettings.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { updateSettingSchema } from './systemSettings.schema';

const router = Router();

// Retrieve all system configurations (Admin-only)
router.get('/', requireAuth, requireRole(['Admin']), listSettings);

// Update a system configuration (Admin-only)
router.put('/:key', requireAuth, requireRole(['Admin']), validateRequest(updateSettingSchema), updateSetting);

export default router;

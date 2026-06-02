import { Router } from 'express';
import { createStaff, listStaff, getStaff, updateStaff, deactivateStaff, reactivateStaff, deleteStaff, importStaffCSV } from './staff.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createStaffSchema, updateStaffSchema } from './staff.schema';

const router = Router();

// Read operations: Allowed for authenticated users
router.get('/', requireAuth, listStaff);
router.get('/:id', requireAuth, getStaff);

// Write operations: Restricted to Admin
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createStaffSchema), createStaff);
router.post('/import', requireAuth, requireRole(['Admin']), importStaffCSV);
router.put('/:id', requireAuth, requireRole(['Admin']), validateRequest(updateStaffSchema), updateStaff);
router.patch('/:id/deactivate', requireAuth, requireRole(['Admin']), deactivateStaff);
router.patch('/:id/reactivate', requireAuth, requireRole(['Admin']), reactivateStaff);
router.delete('/:id', requireAuth, requireRole(['Admin']), deleteStaff);

export default router;

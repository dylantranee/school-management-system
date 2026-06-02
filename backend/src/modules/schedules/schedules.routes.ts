import { Router } from 'express';
import { createSchedule, listSchedules, deleteSchedule, updateSchedule } from './schedules.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createScheduleSchema, updateScheduleSchema } from './schedules.schema';

const router = Router();

// Read operations: Allowed for authenticated users
router.get('/', requireAuth, listSchedules);

// Write operations: Restricted to Admin (SMS-25)
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createScheduleSchema), createSchedule);
router.put('/:id', requireAuth, requireRole(['Admin']), validateRequest(updateScheduleSchema), updateSchedule);
router.delete('/:id', requireAuth, requireRole(['Admin']), deleteSchedule);

export default router;

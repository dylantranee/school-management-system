import { Router } from 'express';
import { createSalary, listSalaries } from './salaries.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createSalarySchema } from './salaries.schema';

const router = Router();

// Read operations: Staff see their own; Admins see all (handled by controller checks)
router.get('/', requireAuth, requireRole(['Admin', 'Staff']), listSalaries);

// Write operations: Restricted to Admin
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createSalarySchema), createSalary);

export default router;

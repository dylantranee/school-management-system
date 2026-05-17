import { Router } from 'express';
import { createUser } from './users.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createUserSchema } from './users.schema';

const router = Router();

// SMS-2: Only Admin can access this route
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createUserSchema), createUser);

export default router;

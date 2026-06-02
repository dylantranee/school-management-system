import { Router } from 'express';
import { createUser, listUsers, deactivateUser, reactivateUser, unlockUser, resendActivationLink, updateUserRole, deleteUser } from './users.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createUserSchema } from './users.schema';

const router = Router();

// Only Admin can access these routes (SMS-3)
router.get('/', requireAuth, requireRole(['Admin']), listUsers);
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createUserSchema), createUser);

router.patch('/:id/deactivate', requireAuth, requireRole(['Admin']), deactivateUser);
router.patch('/:id/reactivate', requireAuth, requireRole(['Admin']), reactivateUser);
router.patch('/:id/unlock', requireAuth, requireRole(['Admin']), unlockUser);
router.post('/:id/resend-activation', requireAuth, requireRole(['Admin']), resendActivationLink);
router.patch('/:id/role', requireAuth, requireRole(['Admin']), updateUserRole);
router.delete('/:id', requireAuth, requireRole(['Admin']), deleteUser);

export default router;



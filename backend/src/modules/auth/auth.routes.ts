import { Router } from 'express';
import { login, logout, getMe } from './auth.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { validateRequest } from '../../middlewares/validateRequest';
import { loginSchema } from './auth.schema';

const router = Router();

router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;

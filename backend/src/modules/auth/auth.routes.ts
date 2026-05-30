import { Router } from 'express';
import { login, logout } from './auth.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { loginSchema } from './auth.schema';

const router = Router();

router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', logout);

export default router;

import { Router } from 'express';
import { login, logout, getMe } from './auth.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { validateRequest } from '../../middlewares/validateRequest';
import { loginSchema } from './auth.schema';
import prisma from '../../config/db';

const router = Router();

router.get('/debug-db', async (req, res, next) => {
  try {
    const tables = await prisma.$queryRawUnsafe<any[]>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    res.json({
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'not set',
      databaseUrlConfigured: !!process.env.DATABASE_URL,
      tables
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;

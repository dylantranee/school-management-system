import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';
import prisma from './config/db';
import crypto from 'crypto';

const app = express();
const port = env.PORT;

const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health Check Route
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Central API Router
app.use('/api/v1', apiRouter);

// Global Error Handler must be the last middleware
app.use(errorHandler);

// Startup system settings seeder
async function seedSystemSettings() {
  const defaultSettings = [
    { key: 'MAX_FAILED_LOGIN_ATTEMPTS', value: '5', description: 'Number of failed login attempts before locking account' },
    { key: 'LOGIN_LOCKOUT_DURATION_MINUTES', value: '15', description: 'Lockout duration in minutes for locked accounts' },
    { key: 'MAX_SUBJECT_CREDITS', value: '10', description: 'Maximum credits allowed for a subject' },
    { key: 'MAX_ROOM_CAPACITY', value: '250', description: 'Maximum capacity allowed for a room' },
    { key: 'CURRENT_ACADEMIC_YEAR', value: '2026', description: 'The current active academic year for course registration and scheduling' },
    { key: 'CURRENT_SEMESTER', value: '1', description: 'The current active semester (1, 2, or 3)' },
    { key: 'MAX_SEMESTER_CREDITS', value: '20', description: 'Maximum credits a student is allowed to enroll in per semester' },
    { key: 'REGISTRATION_START_DATE', value: '2026-05-01', description: 'The start date for course registration window (YYYY-MM-DD)' },
    { key: 'REGISTRATION_END_DATE', value: '2026-06-30', description: 'The end date for course registration window (YYYY-MM-DD)' }
  ];

  try {
    for (const setting of defaultSettings) {
      const existing = await prisma.system_Setting.findUnique({
        where: { key: setting.key }
      });
      if (!existing) {
        await prisma.system_Setting.create({
          data: {
            id: crypto.randomUUID(),
            key: setting.key,
            value: setting.value,
            description: setting.description,
            created_by: 'SYSTEM',
            updated_by: 'SYSTEM'
          }
        });
        console.log(`🌱 [Settings Seeder] Seeded default setting: ${setting.key} = ${setting.value}`);
      }
    }
  } catch (error) {
    console.error('❌ [Settings Seeder] Error seeding default system settings:', error);
  }
}

// Seed settings and start server
seedSystemSettings().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port} in ${env.NODE_ENV} mode`);
  });
});

export default app;

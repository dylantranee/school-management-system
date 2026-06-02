import { Router } from 'express';
import { login, logout, getMe, forgotPassword, resetPassword, activateAccount, changePassword } from './auth.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { validateRequest } from '../../middlewares/validateRequest';
import { loginSchema } from './auth.schema';
import { rateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// 10 login requests per 60s per IP (SMS-1 Scenario 9)
const loginRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many login attempts from this IP address. Please try again after 60 seconds.',
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown'
});

// 3 forgot-password requests per hour per email/IP (SMS-2 Scenario 1)
const forgotPasswordRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests. Please try again after an hour.',
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body.email ? String(req.body.email).toLowerCase().trim() : 'anonymous';
    return [`ip:${ip}`, `email:${email}`];
  }
});

router.post('/login', loginRateLimiter, validateRequest(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

// Onboarding and Password Reset routes
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/activate', activateAccount);
router.post('/change-password', requireAuth, changePassword);

export default router;


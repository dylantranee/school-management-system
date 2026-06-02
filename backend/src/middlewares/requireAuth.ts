import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { isBlacklisted } from '../utils/blacklist';
import prisma from '../config/db';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (isBlacklisted(token)) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    const payload = verifyToken(token);
    
    // Database active status check (SMS-1 Scenario 5 / SMS-3 Scenario 5)
    const dbUser = await prisma.users.findUnique({
      where: { id: payload.userId },
      select: { is_active: true }
    });

    if (!dbUser || dbUser.is_active === false) {
      return res.status(401).json({ message: 'Your account is currently inactive. Please contact the administrator.' });
    }

    // Attach user to request
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};


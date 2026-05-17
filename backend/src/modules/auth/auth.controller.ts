import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../config/db';
import { signToken } from '../../utils/jwt';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middlewares/errorHandler';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.users.findUnique({
    where: { email }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check if account is inactive (Scenario 4)
  if (!user.is_active) {
    throw new ApiError(403, 'Your account is currently inactive. Please contact the administrator.');
  }

  // Check if account is temporarily locked (Scenario 3)
  if (user.locked_until && new Date() < user.locked_until) {
    throw new ApiError(403, 'Account locked due to too many failed attempts. Please try again later.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const newFailedAttempts = user.failed_login_attempts + 1;
    let lockedUntil = user.locked_until;

    if (newFailedAttempts >= 5) {
      // Lock for 15 minutes
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await prisma.users.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: newFailedAttempts,
        locked_until: lockedUntil
      }
    });

    if (newFailedAttempts >= 5) {
      throw new ApiError(403, 'Account locked due to too many failed attempts. Please try again later.');
    }

    throw new ApiError(401, 'Invalid credentials');
  }

  // Success, reset failed attempts
  await prisma.users.update({
    where: { id: user.id },
    data: {
      failed_login_attempts: 0,
      locked_until: null
    }
  });

  const token = signToken({ userId: user.id, role: user.role });

  // Scenario 1: Set HttpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  const { password_hash, ...userWithoutPassword } = user;

  res.status(200).json({
    message: 'Login successful',
    user: userWithoutPassword,
    token
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Scenario 1 of SMS-22: Secure logout
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

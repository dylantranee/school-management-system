import { Request, Response } from 'express';
import { authService } from './auth.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { addToBlacklist } from '../../utils/blacklist';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { token, user } = await authService.login({ email, password });

  // Cookie storage (Scenario 1)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  res.status(200).json({
    message: 'Login successful',
    user,
    token
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (token) {
    addToBlacklist(token); // Invalidate token server-side (Scenario 7)
  }

  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.userId);
  res.status(200).json(user);
});

// Forgot Password Flow (Scenario 1)
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  res.status(200).json({ message: 'If this email is registered, you will receive a reset link.' });
});

// Reset Password Flow (Scenario 2)
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword({ token, newPassword });
  res.status(200).json({ message: 'Password has been reset successfully. Please log in again.' });
});

// Setup Initial Password / Activate Account (Scenario 3 & 4)
export const activateAccount = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  await authService.activateAccount({ token, password });
  res.status(200).json({ message: 'Account activated successfully. You can now log in.' });
});

// Change Password from Profile (SMS-4 Scenario 2)
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  await authService.changePassword({ userId, currentPassword, newPassword });

  // Invalidate session (Scenario 2)
  const currentToken = req.cookies.token;
  if (currentToken) {
    addToBlacklist(currentToken);
  }

  res.status(200).json({ message: 'Password changed successfully.' });
});

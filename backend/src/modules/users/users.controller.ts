import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { usersService } from './users.service';

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const actorId = req.user?.userId || 'system';
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  
  const result = await usersService.createUser(actorId, clientIp, req.body);
  
  res.status(201).json({
    message: 'User created successfully. Activation link generated.',
    user: result.user,
    activationToken: result.activationToken
  });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const search = req.query.search as string || '';
  const role = req.query.role as string || '';
  const is_active = req.query.is_active as string || '';
  const status = req.query.status as string || '';

  const result = await usersService.listUsers({ page, limit, search, role, is_active, status });
  res.status(200).json(result);
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorId = req.user!.userId;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  await usersService.deactivateUser(id, actorId, clientIp);
  res.status(200).json({ message: 'User account deactivated successfully.' });
});

export const reactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorId = req.user!.userId;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  await usersService.reactivateUser(id, actorId, clientIp);
  res.status(200).json({ message: 'User account reactivated successfully.' });
});

export const unlockUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorId = req.user!.userId;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  await usersService.unlockUser(id, actorId, clientIp);
  res.status(200).json({ message: 'User account unlocked successfully.' });
});

export const resendActivationLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorId = req.user!.userId;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  const result = await usersService.resendActivationLink(id, actorId, clientIp);
  res.status(200).json({
    message: 'Activation link resent successfully.',
    activationToken: result.activationToken
  });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const actorId = req.user!.userId;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  await usersService.updateUserRole(id, role, actorId, clientIp);
  res.status(200).json({ message: 'User role updated successfully.' });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorId = req.user!.userId;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  await usersService.deleteUser(id, actorId, clientIp);
  res.status(200).json({ message: 'User deleted successfully.' });
});

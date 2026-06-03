import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { feesService } from './fees.service';

export const generateSemesterFees = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.userId;
  const result = await feesService.generateSemesterFees(adminId, req.body);
  res.status(201).json(result);
});

export const listFees = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const { page, limit } = req.query;

  const result = await feesService.listFees(userId, userRole, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined
  });
  res.json(result);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body;
  const adminId = req.user!.userId;

  const result = await feesService.recordPayment(id, amount, adminId);
  res.json(result);
});

export const checkOverdueFees = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.userId;
  const result = await feesService.checkOverdueFees(adminId);
  res.json(result);
});

export const handlePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-signature'];
  const result = await feesService.handlePaymentWebhook(req.body, signature);
  res.json(result);
});

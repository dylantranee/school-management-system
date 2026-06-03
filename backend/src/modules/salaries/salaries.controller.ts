import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { salariesService } from './salaries.service';

export const createSalary = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.userId;
  const salary = await salariesService.createSalary(adminId, req.body);
  res.status(201).json(salary);
});

export const listSalaries = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const { page, limit } = req.query;

  const salaries = await salariesService.listSalaries(userId, userRole, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined
  });
  res.json(salaries);
});


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
  const salaries = await salariesService.listSalaries(userId, userRole);
  res.json(salaries);
});

export const exportPayslipPDF = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  const { doc, fileName } = await salariesService.exportPayslipPDF(id, userId, userRole);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

  doc.pipe(res);
  doc.end();
});

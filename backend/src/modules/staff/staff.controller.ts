import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { staffService } from './staff.service';

export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await staffService.createStaff(req.body);
  res.status(201).json(staff);
});

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const all = await staffService.listStaff();
  res.json(all);
});

export const getStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const staff = await staffService.getStaff(id);
  res.json(staff);
});

export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const staff = await staffService.updateStaff(id, req.body);
  res.json(staff);
});

export const deactivateStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const staff = await staffService.deactivateStaff(id);
  res.json({ message: 'Staff member deactivated successfully', staff });
});

export const reactivateStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const staff = await staffService.reactivateStaff(id);
  res.json({ message: 'Staff member reactivated successfully', staff });
});

export const deleteStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await staffService.deleteStaff(id);
  res.json(result);
});

export const importStaffCSV = asyncHandler(async (req: Request, res: Response) => {
  const { csvData } = req.body;
  const result = await staffService.importStaffCSV(csvData);
  res.status(201).json({
    message: 'CSV processing complete',
    ...result
  });
});

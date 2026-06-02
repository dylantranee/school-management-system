import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { scheduleService } from './schedules.service';

export const createSchedule = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.userId;
  const result = await scheduleService.createSchedule(adminId, req.body);
  res.status(201).json(result);
});

export const updateSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.userId;
  const result = await scheduleService.updateSchedule(id, adminId, req.body);
  res.json(result);
});

export const listSchedules = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const { studentId, staffId } = req.query;

  const result = await scheduleService.listSchedules(userId, userRole, {
    studentId: studentId as string,
    staffId: staffId as string
  });
  res.json(result);
});

export const deleteSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await scheduleService.deleteSchedule(id);
  res.json(result);
});

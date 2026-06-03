import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { enrollmentService } from './enrollments.service';

export const createEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const { course_section_id } = req.body;
  const userId = req.user!.userId;

  const result = await enrollmentService.createEnrollment(userId, course_section_id);
  res.status(201).json(result);
});

export const listEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  const result = await enrollmentService.listEnrollments(userId, userRole);
  res.json(result);
});

export const updateEnrollmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, comment } = req.body;
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  const result = await enrollmentService.updateEnrollmentStatus(id, status, userId, userRole, comment);
  res.json(result);
});

export const dropEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  const result = await enrollmentService.dropEnrollment(id, userId, userRole);
  res.json(result);
});

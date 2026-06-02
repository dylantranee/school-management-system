import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { courseSectionService } from './course-sections.service';

export const createCourseSection = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.userId;
  const result = await courseSectionService.createCourseSection(adminId, req.body);
  res.status(201).json(result);
});

export const listCourseSections = asyncHandler(async (req: Request, res: Response) => {
  const result = await courseSectionService.listCourseSections();
  res.json(result);
});

export const getCourseSection = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await courseSectionService.getCourseSection(id);
  res.json(result);
});

export const updateCourseSection = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.userId;
  const result = await courseSectionService.updateCourseSection(id, adminId, req.body);
  res.json(result);
});

export const deleteCourseSection = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await courseSectionService.deleteCourseSection(id);
  res.json(result);
});

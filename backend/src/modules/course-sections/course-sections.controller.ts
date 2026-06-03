import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { courseSectionService } from './course-sections.service';

export const createCourseSection = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.userId;
  const result = await courseSectionService.createCourseSection(adminId, req.body);
  res.status(201).json(result);
});

export const listCourseSections = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, semester, academic_year, search } = req.query;
  const result = await courseSectionService.listCourseSections({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    semester: semester ? String(semester) : undefined,
    academic_year: academic_year ? Number(academic_year) : undefined,
    search: search ? String(search) : undefined
  });
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

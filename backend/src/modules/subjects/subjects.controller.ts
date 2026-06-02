import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { subjectsService } from './subjects.service';

export const createSubject = asyncHandler(async (req: Request, res: Response) => {
  const subject = await subjectsService.createSubject(req.body);
  res.status(201).json(subject);
});

export const listSubjects = asyncHandler(async (req: Request, res: Response) => {
  const all = await subjectsService.listSubjects();
  res.json(all);
});

export const getSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const subject = await subjectsService.getSubject(id);
  res.json(subject);
});

export const updateSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const subject = await subjectsService.updateSubject(id, req.body);
  res.json(subject);
});

export const deleteSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await subjectsService.deleteSubject(id);
  res.json(result);
});

export const reactivateSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await subjectsService.reactivateSubject(id);
  res.json({ message: 'Subject reactivated successfully', subject: result });
});

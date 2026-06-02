import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { studentsService } from './students.service';

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentsService.createStudent(req.body);
  res.status(201).json(student);
});

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const all = await studentsService.listStudents();
  res.json(all);
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await studentsService.getStudent(id);
  res.json(student);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await studentsService.updateStudent(id, req.body);
  res.json(student);
});

export const deactivateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await studentsService.deactivateStudent(id);
  res.json({
    message: 'Student deactivated successfully',
    ...result
  });
});

export const reactivateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await studentsService.reactivateStudent(id);
  res.json({ message: 'Student reactivated successfully', student });
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await studentsService.deleteStudent(id);
  res.json(result);
});

export const importStudentCSV = asyncHandler(async (req: Request, res: Response) => {
  const { csvData } = req.body;
  const result = await studentsService.importStudentCSV(csvData);
  res.status(201).json({
    message: 'CSV processing complete',
    ...result
  });
});

export const exportTimetablePDF = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  const { doc, fileName } = await studentsService.exportTimetablePDF(id, userId, userRole);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

  doc.pipe(res);
  doc.end();
});

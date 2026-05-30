import { Request, Response } from 'express';
import prisma from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const { student_code, student_first_name, student_last_name, enrollment_date, userId } = req.body;

  const existing = await prisma.student.findUnique({
    where: { student_code }
  });
  if (existing) {
    throw new ApiError(409, 'Student code already in use');
  }

  if (userId) {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new ApiError(400, 'Linked user not found');
    }
    const userAlreadyLinked = await prisma.student.findUnique({
      where: { user_id: userId }
    });
    if (userAlreadyLinked) {
      throw new ApiError(409, 'User is already linked to another student');
    }
  }

  const student = await prisma.student.create({
    data: {
      id: crypto.randomUUID(),
      student_code,
      student_first_name,
      student_last_name,
      enrollment_date: enrollment_date ? new Date(enrollment_date) : null,
      user_id: userId || null
    }
  });

  res.status(201).json(student);
});

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const all = await prisma.student.findMany({
    include: {
      Users: {
        select: {
          email: true,
          is_active: true,
          role: true
        }
      }
    }
  });
  res.json(all);
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      Users: {
        select: {
          email: true,
          is_active: true,
          role: true
        }
      }
    }
  });
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }
  res.json(student);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { student_code, student_first_name, student_last_name, enrollment_date } = req.body;

  const student = await prisma.student.findUnique({
    where: { id }
  });
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  if (student_code && student_code !== student.student_code) {
    const other = await prisma.student.findUnique({
      where: { student_code }
    });
    if (other) {
      throw new ApiError(409, 'Student code already in use');
    }
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      student_code: student_code ?? student.student_code,
      student_first_name: student_first_name ?? student.student_first_name,
      student_last_name: student_last_name ?? student.student_last_name,
      enrollment_date: enrollment_date ? new Date(enrollment_date) : student.enrollment_date
    }
  });

  res.json(updated);
});

export const deactivateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await prisma.student.findUnique({
    where: { id }
  });
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  if (student.user_id) {
    await prisma.users.update({
      where: { id: student.user_id },
      data: { is_active: false }
    });
  }

  res.json({ message: 'Student deactivated successfully', student });
});

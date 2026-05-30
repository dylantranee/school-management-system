import { Request, Response } from 'express';
import prisma from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';

export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const { employee_code, staff_first_name, staff_last_name, hire_date, department, userId } = req.body;

  const existing = await prisma.staff.findUnique({
    where: { employee_code }
  });
  if (existing) {
    throw new ApiError(409, 'Employee code already in use');
  }

  if (userId) {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new ApiError(400, 'Linked user not found');
    }
    const userAlreadyLinked = await prisma.staff.findUnique({
      where: { user_id: userId }
    });
    if (userAlreadyLinked) {
      throw new ApiError(409, 'User is already linked to another staff member');
    }
  }

  const staff = await prisma.staff.create({
    data: {
      id: crypto.randomUUID(),
      employee_code,
      staff_first_name,
      staff_last_name,
      hire_date: hire_date ? new Date(hire_date) : null,
      department,
      user_id: userId || null
    }
  });

  res.status(201).json(staff);
});

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const all = await prisma.staff.findMany({
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

export const getStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const staff = await prisma.staff.findUnique({
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
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }
  res.json(staff);
});

export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { employee_code, staff_first_name, staff_last_name, hire_date, department } = req.body;

  const staff = await prisma.staff.findUnique({
    where: { id }
  });
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  if (employee_code && employee_code !== staff.employee_code) {
    const other = await prisma.staff.findUnique({
      where: { employee_code }
    });
    if (other) {
      throw new ApiError(409, 'Employee code already in use');
    }
  }

  const updated = await prisma.staff.update({
    where: { id },
    data: {
      employee_code: employee_code ?? staff.employee_code,
      staff_first_name: staff_first_name ?? staff.staff_first_name,
      staff_last_name: staff_last_name ?? staff.staff_last_name,
      hire_date: hire_date ? new Date(hire_date) : staff.hire_date,
      department: department ?? staff.department
    }
  });

  res.json(updated);
});

export const deactivateStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const staff = await prisma.staff.findUnique({
    where: { id }
  });
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  if (staff.user_id) {
    await prisma.users.update({
      where: { id: staff.user_id },
      data: { is_active: false }
    });
  }

  res.json({ message: 'Staff member deactivated successfully', staff });
});

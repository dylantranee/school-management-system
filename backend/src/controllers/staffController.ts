import { Request, Response } from 'express';
import prisma from '../config/db';

export async function createStaff(req: Request, res: Response) {
  try {
    const { employee_code, department, userId } = req.body;
    if (!employee_code || !department || !userId) {
      return res.status(400).json({ error: 'employee_code, department and userId are required' });
    }

    const existing = await prisma.staff.findUnique({ where: { employee_code } });
    if (existing) {
      return res.status(409).json({ error: 'employee_code already in use' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(400).json({ error: 'linked user not found' });

    const staff = await prisma.staff.create({
      data: {
        employee_code,
        department,
        user: { connect: { id: userId } },
        active: true,
      },
    });

    return res.status(201).json(staff);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function listStaff(_req: Request, res: Response) {
  try {
    const all = await prisma.staff.findMany();
    return res.json(all);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function getStaff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return res.status(404).json({ error: 'not_found' });
    return res.json(staff);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function updateStaff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { employee_code, department } = req.body;

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return res.status(404).json({ error: 'not_found' });

    if (employee_code && employee_code !== staff.employee_code) {
      const other = await prisma.staff.findUnique({ where: { employee_code } });
      if (other && other.id !== id) return res.status(409).json({ error: 'employee_code already in use' });
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        employee_code: employee_code ?? staff.employee_code,
        department: department ?? staff.department,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function deactivateStaff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return res.status(404).json({ error: 'not_found' });

    const updated = await prisma.staff.update({ where: { id }, data: { active: false } });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

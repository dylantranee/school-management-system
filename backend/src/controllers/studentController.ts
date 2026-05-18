import { Request, Response } from 'express';
import prisma from '../config/db';

export async function createStudent(req: Request, res: Response) {
  try {
    const { student_code, userId } = req.body;
    if (!student_code || !userId) {
      return res.status(400).json({ error: 'student_code and userId are required' });
    }

    const existing = await prisma.student.findUnique({ where: { student_code } });
    if (existing) {
      return res.status(409).json({ error: 'student_code already in use' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(400).json({ error: 'linked user not found' });

    const student = await prisma.student.create({
      data: {
        student_code,
        user: { connect: { id: userId } },
        active: true,
      },
    });

    return res.status(201).json(student);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function listStudents(_req: Request, res: Response) {
  try {
    const all = await prisma.student.findMany();
    return res.json(all);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function getStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'not_found' });
    return res.json(student);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function updateStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { student_code } = req.body;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'not_found' });

    if (student_code && student_code !== student.student_code) {
      const other = await prisma.student.findUnique({ where: { student_code } });
      if (other && other.id !== id) return res.status(409).json({ error: 'student_code already in use' });
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        student_code: student_code ?? student.student_code,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function deactivateStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'not_found' });

    const updated = await prisma.student.update({ where: { id }, data: { active: false } });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

import { Request, Response } from 'express';
import prisma from '../config/db';

export async function createSubject(req: Request, res: Response) {
  try {
    const { name, code, credits } = req.body;
    if (!name || !code || credits === undefined) {
      return res.status(400).json({ error: 'name, code and credits are required' });
    }

    if (!Number.isInteger(credits) || credits < 0) {
      return res.status(400).json({ error: 'credits must be a non-negative integer' });
    }

    const existing = await prisma.subject.findUnique({ where: { code } });
    if (existing) return res.status(409).json({ error: 'subject code already exists' });

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        credits,
      },
    });

    return res.status(201).json(subject);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function listSubjects(_req: Request, res: Response) {
  try {
    const all = await prisma.subject.findMany();
    return res.json(all);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function getSubject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return res.status(404).json({ error: 'not_found' });
    return res.json(subject);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function updateSubject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, code, credits } = req.body;

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return res.status(404).json({ error: 'not_found' });

    if (code && code !== subject.code) {
      const other = await prisma.subject.findUnique({ where: { code } });
      if (other && other.id !== id) return res.status(409).json({ error: 'subject code already exists' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (credits !== undefined) {
      if (!Number.isInteger(credits) || credits < 0) {
        return res.status(400).json({ error: 'credits must be a non-negative integer' });
      }
      updateData.credits = credits;
    }

    const updated = await prisma.subject.update({ where: { id }, data: updateData });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

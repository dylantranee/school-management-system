import { Request, Response } from 'express';
import prisma from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';

export const createSubject = asyncHandler(async (req: Request, res: Response) => {
  const { subject_name, subject_code, credits } = req.body;

  const existing = await prisma.subject.findUnique({
    where: { subject_code }
  });
  if (existing) {
    throw new ApiError(409, 'Subject code already exists');
  }

  const subject = await prisma.subject.create({
    data: {
      id: crypto.randomUUID(),
      subject_name,
      subject_code,
      credits
    }
  });

  res.status(201).json(subject);
});

export const listSubjects = asyncHandler(async (req: Request, res: Response) => {
  const all = await prisma.subject.findMany();
  res.json(all);
});

export const getSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const subject = await prisma.subject.findUnique({
    where: { id }
  });
  if (!subject) {
    throw new ApiError(404, 'Subject not found');
  }
  res.json(subject);
});

export const updateSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subject_name, subject_code, credits } = req.body;

  const subject = await prisma.subject.findUnique({
    where: { id }
  });
  if (!subject) {
    throw new ApiError(404, 'Subject not found');
  }

  if (subject_code && subject_code !== subject.subject_code) {
    const other = await prisma.subject.findUnique({
      where: { subject_code }
    });
    if (other) {
      throw new ApiError(409, 'Subject code already exists');
    }
  }

  const updated = await prisma.subject.update({
    where: { id },
    data: {
      subject_name: subject_name ?? subject.subject_name,
      subject_code: subject_code ?? subject.subject_code,
      credits: credits !== undefined ? credits : subject.credits
    }
  });

  res.json(updated);
});

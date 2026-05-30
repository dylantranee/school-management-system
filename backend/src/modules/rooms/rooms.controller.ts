import { Request, Response } from 'express';
import prisma from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const { room_number, capacity, is_lab } = req.body;

  const existing = await prisma.room.findUnique({
    where: { room_number }
  });
  if (existing) {
    throw new ApiError(409, 'Room number already exists');
  }

  const room = await prisma.room.create({
    data: {
      id: crypto.randomUUID(),
      room_number,
      capacity,
      is_lab: is_lab ?? false
    }
  });

  res.status(201).json(room);
});

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const all = await prisma.room.findMany();
  res.json(all);
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = await prisma.room.findUnique({
    where: { id }
  });
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }
  res.json(room);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { room_number, capacity, is_lab } = req.body;

  const room = await prisma.room.findUnique({
    where: { id }
  });
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  if (room_number && room_number !== room.room_number) {
    const other = await prisma.room.findUnique({
      where: { room_number }
    });
    if (other) {
      throw new ApiError(409, 'Room number already exists');
    }
  }

  const updated = await prisma.room.update({
    where: { id },
    data: {
      room_number: room_number ?? room.room_number,
      capacity: capacity ?? room.capacity,
      is_lab: is_lab !== undefined ? is_lab : room.is_lab
    }
  });

  res.json(updated);
});

import { Request, Response } from 'express';
import prisma from '../config/db';

export async function createRoom(req: Request, res: Response) {
  try {
    const { room_number, capacity, is_lab } = req.body;
    if (!room_number || capacity === undefined || is_lab === undefined) {
      return res.status(400).json({ error: 'room_number, capacity, and is_lab are required' });
    }

    if (!Number.isInteger(capacity) || capacity < 0) {
      return res.status(400).json({ error: 'capacity must be a non-negative integer' });
    }

    const room = await prisma.room.create({
      data: {
        room_number,
        capacity,
        is_lab,
      },
    });

    return res.status(201).json(room);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function listRooms(_req: Request, res: Response) {
  try {
    const all = await prisma.room.findMany();
    return res.json(all);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function getRoom(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: 'not_found' });
    return res.json(room);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

export async function updateRoom(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { room_number, capacity, is_lab } = req.body;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: 'not_found' });

    const updateData: any = {};
    if (room_number !== undefined) updateData.room_number = room_number;
    if (capacity !== undefined) {
      if (!Number.isInteger(capacity) || capacity < 0) {
        return res.status(400).json({ error: 'capacity must be a non-negative integer' });
      }
      updateData.capacity = capacity;
    }
    if (is_lab !== undefined) updateData.is_lab = is_lab;

    const updated = await prisma.room.update({ where: { id }, data: updateData });
    return res.json(updated);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

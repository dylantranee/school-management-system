import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { roomsService } from './rooms.service';

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await roomsService.createRoom(req.body);
  res.status(201).json(room);
});

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const all = await roomsService.listRooms();
  res.json(all);
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = await roomsService.getRoom(id);
  res.json(room);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = await roomsService.updateRoom(id, req.body);
  res.json(room);
});

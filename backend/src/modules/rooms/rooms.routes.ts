import { Router } from 'express';
import { createRoom, listRooms, getRoom, updateRoom } from './rooms.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createRoomSchema, updateRoomSchema } from './rooms.schema';

const router = Router();

// Read operations: Allowed for all authenticated users
router.get('/', requireAuth, listRooms);
router.get('/:id', requireAuth, getRoom);

// Write operations: Restricted to Admin
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createRoomSchema), createRoom);
router.put('/:id', requireAuth, requireRole(['Admin']), validateRequest(updateRoomSchema), updateRoom);

export default router;

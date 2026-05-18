import { Router } from 'express';
import * as controller from '../controllers/roomController';

const router = Router();

router.post('/', controller.createRoom);
router.get('/', controller.listRooms);
router.get('/:id', controller.getRoom);
router.put('/:id', controller.updateRoom);

export default router;

import { Router } from 'express';
import * as controller from '../controllers/staffController';

const router = Router();

router.post('/', controller.createStaff);
router.get('/', controller.listStaff);
router.get('/:id', controller.getStaff);
router.put('/:id', controller.updateStaff);
router.patch('/:id/deactivate', controller.deactivateStaff);

export default router;

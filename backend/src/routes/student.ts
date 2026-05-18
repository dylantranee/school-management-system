import { Router } from 'express';
import * as controller from '../controllers/studentController';

const router = Router();

router.post('/', controller.createStudent);
router.get('/', controller.listStudents);
router.get('/:id', controller.getStudent);
router.put('/:id', controller.updateStudent);
router.patch('/:id/deactivate', controller.deactivateStudent);

export default router;

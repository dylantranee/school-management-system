import { Router } from 'express';
import * as controller from '../controllers/subjectController';

const router = Router();

router.post('/', controller.createSubject);
router.get('/', controller.listSubjects);
router.get('/:id', controller.getSubject);
router.put('/:id', controller.updateSubject);

export default router;

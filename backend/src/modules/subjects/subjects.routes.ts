import { Router } from 'express';
import { createSubject, listSubjects, getSubject, updateSubject, deleteSubject, reactivateSubject } from './subjects.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createSubjectSchema, updateSubjectSchema } from './subjects.schema';

const router = Router();

// Read operations: Allowed for authenticated users
router.get('/', requireAuth, listSubjects);
router.get('/:id', requireAuth, getSubject);

// Write operations: Restricted to Admin
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createSubjectSchema), createSubject);
router.put('/:id', requireAuth, requireRole(['Admin']), validateRequest(updateSubjectSchema), updateSubject);
router.delete('/:id', requireAuth, requireRole(['Admin']), deleteSubject);
router.patch('/:id/reactivate', requireAuth, requireRole(['Admin']), reactivateSubject);

export default router;

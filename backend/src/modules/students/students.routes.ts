import { Router } from 'express';
import { createStudent, listStudents, getStudent, updateStudent, deactivateStudent, reactivateStudent, deleteStudent, importStudentCSV, exportTimetablePDF } from './students.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createStudentSchema, updateStudentSchema } from './students.schema';

const router = Router();

// Read operations: Allowed for authenticated users
router.get('/', requireAuth, listStudents);
router.get('/:id/timetable/export', requireAuth, exportTimetablePDF);
router.get('/:id', requireAuth, getStudent);

// Write operations: Restricted to Admin
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createStudentSchema), createStudent);
router.post('/import', requireAuth, requireRole(['Admin']), importStudentCSV);
router.put('/:id', requireAuth, requireRole(['Admin']), validateRequest(updateStudentSchema), updateStudent);
router.patch('/:id/deactivate', requireAuth, requireRole(['Admin']), deactivateStudent);
router.patch('/:id/reactivate', requireAuth, requireRole(['Admin']), reactivateStudent);
router.delete('/:id', requireAuth, requireRole(['Admin']), deleteStudent);

export default router;

import { Router } from 'express';
import { createEnrollment, listEnrollments, updateEnrollmentStatus, dropEnrollment } from './enrollments.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createEnrollmentSchema, updateEnrollmentStatusSchema } from './enrollments.schema';

const router = Router();

// Read operations: Students see their own; Admin/Staff see all (with role checking in controller)
router.get('/', requireAuth, listEnrollments);

// Student registration action: Restricted to Student role
router.post('/', requireAuth, requireRole(['Student']), validateRequest(createEnrollmentSchema), createEnrollment);

// Processing enrollment action: Allowed for Admin and Staff
router.patch('/:id/status', requireAuth, requireRole(['Admin', 'Staff']), validateRequest(updateEnrollmentStatusSchema), updateEnrollmentStatus);

// Course dropping action: Allowed for Student and Admin
router.delete('/:id', requireAuth, requireRole(['Student', 'Admin']), dropEnrollment);

export default router;

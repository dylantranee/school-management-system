import { Router } from 'express';
import { createCourseSection, listCourseSections, getCourseSection, updateCourseSection, deleteCourseSection } from './course-sections.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { createCourseSectionSchema, updateCourseSectionSchema } from './course-sections.schema';

const router = Router();

// Read operations: Allowed for all authenticated users
router.get('/', requireAuth, listCourseSections);
router.get('/:id', requireAuth, getCourseSection);

// Write operations: Restricted to Admin (SMS-24)
router.post('/', requireAuth, requireRole(['Admin']), validateRequest(createCourseSectionSchema), createCourseSection);
router.put('/:id', requireAuth, requireRole(['Admin']), validateRequest(updateCourseSectionSchema), updateCourseSection);
router.delete('/:id', requireAuth, requireRole(['Admin']), deleteCourseSection);

export default router;

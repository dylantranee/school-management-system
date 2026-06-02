import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import roomsRoutes from '../modules/rooms/rooms.routes';
import staffRoutes from '../modules/staff/staff.routes';
import studentsRoutes from '../modules/students/students.routes';
import subjectsRoutes from '../modules/subjects/subjects.routes';
import systemSettingsRoutes from '../modules/system-settings/systemSettings.routes';
import courseSectionsRoutes from '../modules/course-sections/course-sections.routes';
import schedulesRoutes from '../modules/schedules/schedules.routes';
import enrollmentsRoutes from '../modules/enrollments/enrollments.routes';
import feesRoutes from '../modules/fees/fees.routes';
import salariesRoutes from '../modules/salaries/salaries.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import { sanitizeBody } from '../middlewares/sanitizeBody';

const apiRouter = Router();

// Apply global body sanitization to protect against Stored XSS
apiRouter.use(sanitizeBody);

// Mount all module routes here
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/rooms', roomsRoutes);
apiRouter.use('/staff', staffRoutes);
apiRouter.use('/students', studentsRoutes);
apiRouter.use('/subjects', subjectsRoutes);
apiRouter.use('/system-settings', systemSettingsRoutes);
apiRouter.use('/course-sections', courseSectionsRoutes);
apiRouter.use('/schedules', schedulesRoutes);
apiRouter.use('/enrollments', enrollmentsRoutes);
apiRouter.use('/fees', feesRoutes);
apiRouter.use('/salaries', salariesRoutes);
apiRouter.use('/dashboard', dashboardRoutes);

export default apiRouter;

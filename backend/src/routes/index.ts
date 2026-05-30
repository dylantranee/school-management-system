import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import roomsRoutes from '../modules/rooms/rooms.routes';
import staffRoutes from '../modules/staff/staff.routes';
import studentsRoutes from '../modules/students/students.routes';
import subjectsRoutes from '../modules/subjects/subjects.routes';

const apiRouter = Router();

// Mount all module routes here
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/rooms', roomsRoutes);
apiRouter.use('/staff', staffRoutes);
apiRouter.use('/students', studentsRoutes);
apiRouter.use('/subjects', subjectsRoutes);

export default apiRouter;

import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';

const apiRouter = Router();

// Mount all module routes here
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);

export default apiRouter;

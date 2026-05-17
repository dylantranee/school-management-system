import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';

const apiRouter = Router();

// Mount all module routes here
apiRouter.use('/auth', authRoutes);
// Future routes:
// apiRouter.use('/users', userRoutes);
// apiRouter.use('/courses', courseRoutes);

export default apiRouter;

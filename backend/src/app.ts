import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const port = env.PORT;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health Check Route
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Central API Router
app.use('/api/v1', apiRouter);

// Global Error Handler must be the last middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${env.NODE_ENV} mode`);
});

export default app;

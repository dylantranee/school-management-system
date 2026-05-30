import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const port = env.PORT;

const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

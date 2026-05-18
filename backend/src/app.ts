<<<<<<< HEAD
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';

import staffRouter from './routes/staff';
import studentRouter from './routes/student';
import subjectRouter from './routes/subject';
import roomRouter from './routes/room';

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(bodyParser.json());

app.use('/staff', staffRouter);
app.use('/students', studentRouter);
app.use('/subjects', subjectRouter);
app.use('/rooms', roomRouter);

app.get('/', (req, res) => res.json({ ok: true }));
=======
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// TODO: Modular Router Setup
// import userRoutes from './modules/users/user.routes';
// app.use('/api/v1/users', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
>>>>>>> 2da2e38bc4660d39b7d91caa45a0b7ed6793ebbb

export default app;

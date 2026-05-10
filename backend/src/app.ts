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

export default app;

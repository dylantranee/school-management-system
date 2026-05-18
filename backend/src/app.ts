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

export default app;

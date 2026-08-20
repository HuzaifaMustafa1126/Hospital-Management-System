import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { userRouter } from './routes/user.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'Hospital Management API is running' });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use(notFound);
app.use(errorHandler);

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import routes from './routes/index.js';
import { UPLOAD_DIR } from './services/storage.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrls }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.get('/', (req, res) => res.json({ name: 'Arcella API', docs: '/api/health' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;

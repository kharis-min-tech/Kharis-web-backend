import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { HttpError } from './shared/errors/errors.js';
import { errorResponse } from './shared/middleware/response.js';
import healthRouter from './modules/health.js';
import formRoutes from './modules/forms/form.routes.js';
import siteRoutes from './modules/site/site.routes.js';
import studioRoutes from './modules/studio/studio.routes.js';

export const app = express();
// Filled in by src/index.js under Node; empty on Cloudflare Workers.
export const docsRouter = express.Router();
app.use('/api-docs', docsRouter);
app.disable('x-powered-by');
// Only the studio calls from a browser; the websites call from their servers.
// Unset allows every origin.
app.use(cors(config.corsOrigins.length ? { origin: config.corsOrigins } : undefined));
app.use(express.json({ limit: '100kb' }));

app.use('/health', healthRouter);
// Contact, visit and quiz forms (apps/main and apps/kp2 /api/* proxies).
app.use('/api', formRoutes);
// Public reads for kharis.org and KP2 (apps/main and apps/kp2 siteGet).
app.use('/v1/site', siteRoutes);
// Content Studio accounts and data (apps/content studio-api).
app.use('/v1/studio', studioRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json(errorResponse(err.message));
  }
  // Malformed JSON bodies and oversized payloads from express.json().
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return res.status(err.status).json(errorResponse(err.type === 'entity.too.large' ? 'Request body is too large' : 'Invalid JSON body'));
  }
  console.error(err);
  // Never forward the raw error: Supabase errors can name tables and columns.
  res.status(500).json({ error: 'Internal server error' });
});

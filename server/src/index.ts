/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Standalone Production Express Server
 */

import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Serve static frontend in production if built
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`[bdfight Engine] Production server online at http://0.0.0.0:${PORT}`);
});

export { app, server };

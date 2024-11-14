import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initSyncManager } from './sync/syncManager';
import router from './routes';
import { initDatabase } from './db/init';
import logger from './config/logger';
import env from './config/env';
import sseRouter from './sync/adapters/sse';

const app = express();
const server = createServer(app);

// base middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  credentials: true,
  origin: true  // 或者指定具体的前端域名
}));
app.use(cookieParser());

// routes
app.use('/api', router);
app.use('/sse', sseRouter);

// init websocket
initSyncManager(server, 'sse');
// initSyncManager(server, 'websocket')

// init database before start server
initDatabase().then(() => {
  server.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
}).catch(error => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});

export { app, server }; 
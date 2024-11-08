import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initWebSocket } from './websocket';
import router from './routes';
import { initDatabase } from './db/init';
import logger from './config/logger';
import env from './config/env';

const app = express();
const server = createServer(app);

// base middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());

// routes
app.use('/api', router);

// init websocket
initWebSocket(server);

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
import express from 'express';
import { createServer } from 'http';
import { initWebSocket } from './websocket';
import router from './routes';
import { initDatabase } from './db/init';

const app = express();
const server = createServer(app);

// base middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use('/api', router);

// init websocket
initWebSocket(server);

// init database before start server
initDatabase().then(() => {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});

export { app, server }; 
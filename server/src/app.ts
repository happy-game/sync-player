import express from 'express';
import { createServer } from 'http';
import { initWebSocket } from './websocket';
import router from './routes';

const app = express();
const server = createServer(app);

// base middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use('/api', router);

// init websocket
initWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { app, server }; 
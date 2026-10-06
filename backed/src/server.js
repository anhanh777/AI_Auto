import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/database.config.js';
import { initSocket } from './config/socket.config.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`[Server] Server running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

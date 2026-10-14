import { Server } from 'socket.io';

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'https://localhost:5173',
        process.env.CLIENT_URL
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(conversationId.toString());
        console.log(`[Socket.IO] Socket ${socket.id} joined conversation ${conversationId}`);
      }
    });

    socket.on('join_business', (businessId) => {
      if (businessId) {
        socket.join(businessId.toString());
        console.log(`[Socket.IO] Socket ${socket.id} joined business ${businessId}`);
      }
    });

    socket.on('join_channel', (channelId) => {
      if (channelId) {
        socket.join(channelId.toString());
        console.log(`[Socket.IO] Socket ${socket.id} joined channel ${channelId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('[Socket.IO] Socket.io has not been initialized');
  }
  return io;
};

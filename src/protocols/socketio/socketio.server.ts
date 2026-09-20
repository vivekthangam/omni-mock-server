import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { auditService } from '../../audit/audit.service';

export function setupSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io/',
  });

  // Default namespace "/"
  io.on('connection', (socket: Socket) => {
    auditService.record({
      protocol: 'SOCKETIO',
      method: 'CONNECT',
      path: '/socket.io/#/',
      clientIp: socket.handshake.address,
      metadata: { socketId: socket.id },
    });

    socket.emit('welcome', {
      message: 'Connected to OmniMock Socket.IO Server',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Custom event with Acknowledgment Callback
    socket.on('ping_with_ack', (data, callback) => {
      auditService.record({
        protocol: 'SOCKETIO',
        method: 'EVENT',
        path: '/socket.io/ping_with_ack',
        requestBody: data,
      });

      if (typeof callback === 'function') {
        callback({
          status: 'ok',
          received: data,
          serverTimestamp: Date.now(),
        });
      }
    });

    // Rooms support
    socket.on('join_room', (roomName: string) => {
      socket.join(roomName);
      socket.emit('room_joined', { room: roomName });
      socket.to(roomName).emit('user_joined_room', { socketId: socket.id, room: roomName });
    });

    socket.on('room_message', (payload: { room: string; message: any }) => {
      io.to(payload.room).emit('room_broadcast', {
        room: payload.room,
        sender: socket.id,
        message: payload.message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', reason => {
      auditService.record({
        protocol: 'SOCKETIO',
        method: 'DISCONNECT',
        path: '/socket.io/#/',
        metadata: { socketId: socket.id, reason },
      });
    });
  });

  // Dedicated Chat namespace "/chat"
  const chatNamespace = io.of('/chat');
  chatNamespace.on('connection', socket => {
    socket.emit('chat_welcome', { message: 'Welcome to /chat namespace' });

    socket.on('message', data => {
      chatNamespace.emit('new_message', {
        sender: socket.id,
        content: data,
        timestamp: new Date().toISOString(),
      });
    });
  });

  return io;
}

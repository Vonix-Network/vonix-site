import { Server as NetServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { setIO, getConversationRoom } from './socket-emit';

export type NextApiResponseWithSocket = {
    socket: {
        server: NetServer & {
            io?: SocketIOServer;
        };
    };
};

// Store user socket mappings
const userSockets = new Map<number, Set<string>>();

export function getUserSockets(userId: number): Set<string> {
    return userSockets.get(userId) || new Set();
}

export function addUserSocket(userId: number, socketId: string) {
    if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socketId);
}

export function removeUserSocket(userId: number, socketId: string) {
    const sockets = userSockets.get(userId);
    if (sockets) {
        sockets.delete(socketId);
        if (sockets.size === 0) {
            userSockets.delete(userId);
        }
    }
}

// Emit message to specific user
export function emitToUser(io: SocketIOServer, userId: number, event: string, data: any) {
    const sockets = getUserSockets(userId);
    sockets.forEach(socketId => {
        io.to(socketId).emit(event, data);
    });
}

// Initialize Socket.io server
export function initSocketServer(server: NetServer): SocketIOServer {
    const io = new SocketIOServer(server, {
        path: '/api/socketio',
        addTrailingSlash: false,
        cors: {
            origin: process.env.NEXT_PUBLIC_APP_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // Store the IO instance globally for use in API routes
    setIO(io);

    io.on('connection', async (socket: Socket) => {
        console.log('Socket connected:', socket.id);

        // Get user ID from auth
        const userId = socket.handshake.auth.userId;

        if (userId) {
            const numericUserId = parseInt(userId);
            addUserSocket(numericUserId, socket.id);
            console.log(`User ${numericUserId} connected with socket ${socket.id}`);

            // Join user's personal room
            socket.join(`user:${numericUserId}`);
        }

        // Handle joining conversation rooms
        socket.on('join:conversation', (otherUserId: number) => {
            if (userId) {
                const roomId = getConversationRoom(parseInt(userId), otherUserId);
                socket.join(roomId);
                console.log(`Socket ${socket.id} joined conversation ${roomId}`);
            }
        });

        // Handle leaving conversation rooms
        socket.on('leave:conversation', (otherUserId: number) => {
            if (userId) {
                const roomId = getConversationRoom(parseInt(userId), otherUserId);
                socket.leave(roomId);
                console.log(`Socket ${socket.id} left conversation ${roomId}`);
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            if (userId) {
                removeUserSocket(parseInt(userId), socket.id);
                console.log(`User ${userId} disconnected socket ${socket.id}`);
            }
        });
    });

    return io;
}

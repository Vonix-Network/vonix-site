import { Server as SocketIOServer } from 'socket.io';

// Global reference to io instance
let ioInstance: SocketIOServer | undefined;

export function setIO(io: SocketIOServer) {
    ioInstance = io;
}

export function getIO(): SocketIOServer | undefined {
    return ioInstance;
}

// Get consistent room ID for a conversation between two users
export function getConversationRoom(userId1: number, userId2: number): string {
    const sorted = [userId1, userId2].sort((a, b) => a - b);
    return `conversation:${sorted[0]}:${sorted[1]}`;
}

// Emit new message to both participants
export function emitNewMessage(senderId: number, recipientId: number, message: any) {
    const io = getIO();
    if (!io) {
        console.log('Socket.io not initialized, skipping emit');
        return;
    }

    const room = getConversationRoom(senderId, recipientId);

    // Emit to the conversation room
    io.to(room).emit('message:new', message);

    // Also emit to both users' personal rooms for notification
    io.to(`user:${senderId}`).emit('message:sent', message);
    io.to(`user:${recipientId}`).emit('message:new', message);

    console.log(`Emitted message to room ${room} and users ${senderId}, ${recipientId}`);
}

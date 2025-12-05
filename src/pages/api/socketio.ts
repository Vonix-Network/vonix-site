import { NextApiRequest, NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initSocketServer } from '@/lib/socket-server';

export const config = {
    api: {
        bodyParser: false,
    },
};

type NextApiResponseWithSocket = NextApiResponse & {
    socket: {
        server: NetServer & {
            io?: SocketIOServer;
        };
    };
};

let io: SocketIOServer | undefined;

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
    if (!res.socket.server.io) {
        console.log('Initializing Socket.io server...');
        io = initSocketServer(res.socket.server as NetServer);
        res.socket.server.io = io;
    }

    res.end();
}

// Export io instance for use in other API routes
export function getIO(): SocketIOServer | undefined {
    return io;
}

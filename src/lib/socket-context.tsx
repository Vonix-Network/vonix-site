'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface Message {
    id: number;
    senderId: number;
    recipientId: number;
    content: string;
    createdAt: string;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    joinConversation: (otherUserId: number) => void;
    leaveConversation: (otherUserId: number) => void;
    onNewMessage: (callback: (message: Message) => void) => () => void;
    onMessageSent: (callback: (message: Message) => void) => () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    joinConversation: () => { },
    leaveConversation: () => { },
    onNewMessage: () => () => { },
    onMessageSent: () => () => { },
});

export function useSocket() {
    return useContext(SocketContext);
}

interface SocketProviderProps {
    children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const { data: session, status } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.id) {
            return;
        }

        const userId = session.user.id;

        // Initialize socket connection
        const socketInstance = io({
            path: '/api/socketio',
            auth: { userId },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
            console.log('Socket connected:', socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
            setSocket(null);
            setIsConnected(false);
        };
    }, [session?.user?.id, status]);

    const joinConversation = useCallback((otherUserId: number) => {
        if (socket?.connected) {
            socket.emit('join:conversation', otherUserId);
        }
    }, [socket]);

    const leaveConversation = useCallback((otherUserId: number) => {
        if (socket?.connected) {
            socket.emit('leave:conversation', otherUserId);
        }
    }, [socket]);

    const onNewMessage = useCallback((callback: (message: Message) => void) => {
        if (!socket) return () => { };

        socket.on('message:new', callback);
        return () => {
            socket.off('message:new', callback);
        };
    }, [socket]);

    const onMessageSent = useCallback((callback: (message: Message) => void) => {
        if (!socket) return () => { };

        socket.on('message:sent', callback);
        return () => {
            socket.off('message:sent', callback);
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={{
            socket,
            isConnected,
            joinConversation,
            leaveConversation,
            onNewMessage,
            onMessageSent,
        }}>
            {children}
        </SocketContext.Provider>
    );
}

'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/lib/socket-context';

interface DiscordMessage {
    id: number;
    discordMessageId?: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    isFromWeb: boolean;
    webUserId?: number;
    embeds: any[];
    attachments: any[];
    createdAt: Date;
}

interface DiscordSettings {
    enabled: boolean;
    channelName?: string;
}

interface DiscordChatContextType {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    isMinimized: boolean;
    setIsMinimized: (minimized: boolean) => void;
    messages: DiscordMessage[];
    isLoading: boolean;
    isSending: boolean;
    settings: DiscordSettings;
    sendMessage: (content: string) => Promise<boolean>;
    refreshMessages: () => Promise<void>;
    lastMessageId: number | null;
}

const DiscordChatContext = createContext<DiscordChatContextType | null>(null);

export function useDiscordChat() {
    const context = useContext(DiscordChatContext);
    if (!context) {
        throw new Error('useDiscordChat must be used within DiscordChatProvider');
    }
    return context;
}

const POLL_INTERVAL = 5000; // 5 seconds fallback polling

export function DiscordChatProvider({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const { socket, isConnected } = useSocket();
    // Start with isOpen=true so the window is always visible, but minimized by default
    const [isOpen, setIsOpen] = useState(true);
    const [isMinimized, setIsMinimized] = useState(true);
    const [messages, setMessages] = useState<DiscordMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [settings, setSettings] = useState<DiscordSettings>({ enabled: false });
    const [lastMessageId, setLastMessageId] = useState<number | null>(null);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/discord-chat/settings');
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                }
            } catch (err: any) {
                console.error('Failed to fetch discord chat settings:', err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch messages
    const refreshMessages = useCallback(async (afterId?: number) => {
        try {
            if (!afterId) setIsLoading(true);

            const url = afterId
                ? `/api/discord-chat?after=${afterId}`
                : '/api/discord-chat?limit=50';

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const newMessages: DiscordMessage[] = (data.messages || []).map((m: any) => ({
                    ...m,
                    createdAt: new Date(m.createdAt),
                }));

                if (afterId && newMessages.length > 0) {
                    // Append new messages
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
                        return [...prev, ...uniqueNew];
                    });
                } else if (!afterId) {
                    // Initial load
                    setMessages(newMessages);
                }

                if (newMessages.length > 0) {
                    const maxId = Math.max(...newMessages.map(m => m.id));
                    setLastMessageId(prev => (prev === null || maxId > prev) ? maxId : prev);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch discord messages:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load when chat is not minimized
    useEffect(() => {
        if (isOpen && !isMinimized && messages.length === 0) {
            refreshMessages();
        }
    }, [isOpen, isMinimized, messages.length, refreshMessages]);

    // Join/leave Discord chat room when socket is connected and chat is open
    useEffect(() => {
        if (!socket || !isConnected) return;

        if (isOpen && !isMinimized) {
            socket.emit('join:discord-chat');
        }

        return () => {
            if (socket?.connected) {
                socket.emit('leave:discord-chat');
            }
        };
    }, [socket, isConnected, isOpen, isMinimized]);

    // Listen for real-time Discord messages via socket
    useEffect(() => {
        if (!socket || !isConnected || !isOpen) return;

        const handleNewDiscordMessage = (message: any) => {
            const newMessage: DiscordMessage = {
                ...message,
                createdAt: new Date(message.createdAt),
                embeds: message.embeds || [],
                attachments: message.attachments || [],
            };

            setMessages(prev => {
                // Check if message already exists
                if (prev.some(m => m.id === newMessage.id)) {
                    return prev;
                }
                return [...prev, newMessage];
            });

            if (newMessage.id) {
                setLastMessageId(prev => (prev === null || newMessage.id > prev) ? newMessage.id : prev);
            }
        };

        socket.on('discord:message', handleNewDiscordMessage);

        return () => {
            socket.off('discord:message', handleNewDiscordMessage);
        };
    }, [socket, isConnected, isOpen]);

    // Fallback polling for new messages when socket is not connected
    useEffect(() => {
        // Only poll if socket is not connected
        if (!isOpen || isConnected || isMinimized) return;

        const poll = () => {
            if (lastMessageId !== null) {
                refreshMessages(lastMessageId);
            }
        };

        const interval = setInterval(poll, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [isOpen, isConnected, isMinimized, lastMessageId, refreshMessages]);

    // Send message
    const sendMessage = useCallback(async (content: string): Promise<boolean> => {
        if (!session?.user) return false;
        if (!content.trim()) return false;

        setIsSending(true);
        try {
            const res = await fetch('/api/discord-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content.trim() }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.message) {
                    // Add message locally immediately (optimistic update)
                    // Socket will also broadcast it, so we check for duplicates above
                    setMessages(prev => {
                        if (prev.some(m => m.id === data.message.id)) {
                            return prev;
                        }
                        return [...prev, {
                            ...data.message,
                            createdAt: new Date(data.message.createdAt),
                            embeds: [],
                            attachments: [],
                        }];
                    });
                    setLastMessageId(data.message.id);
                }
                return true;
            }

            const error = await res.json();
            console.error('Failed to send message:', error);
            return false;
        } catch (err: any) {
            console.error('Failed to send message:', err);
            return false;
        } finally {
            setIsSending(false);
        }
    }, [session?.user]);

    return (
        <DiscordChatContext.Provider
            value={{
                isOpen,
                setIsOpen,
                isMinimized,
                setIsMinimized,
                messages,
                isLoading,
                isSending,
                settings,
                sendMessage,
                refreshMessages: () => refreshMessages(),
                lastMessageId,
            }}
        >
            {children}
        </DiscordChatContext.Provider>
    );
}

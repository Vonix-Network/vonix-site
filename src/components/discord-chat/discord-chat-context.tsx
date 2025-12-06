'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

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

const POLL_INTERVAL = 5000; // 5 seconds

export function DiscordChatProvider({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
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
            } catch (err) {
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
        } catch (err) {
            console.error('Failed to fetch discord messages:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load when chat opens
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            refreshMessages();
        }
    }, [isOpen, messages.length, refreshMessages]);

    // Poll for new messages when open
    useEffect(() => {
        if (!isOpen) return;

        const poll = () => {
            if (lastMessageId !== null) {
                refreshMessages(lastMessageId);
            }
        };

        const interval = setInterval(poll, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [isOpen, lastMessageId, refreshMessages]);

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
                    setMessages(prev => [...prev, {
                        ...data.message,
                        createdAt: new Date(data.message.createdAt),
                        embeds: [],
                        attachments: [],
                    }]);
                    setLastMessageId(data.message.id);
                }
                return true;
            }

            const error = await res.json();
            console.error('Failed to send message:', error);
            return false;
        } catch (err) {
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


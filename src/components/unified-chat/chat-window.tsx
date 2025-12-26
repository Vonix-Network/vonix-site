'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Loader2, ArrowDown, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getMinecraftAvatarUrl, getInitials } from '@/lib/utils';
import { PresenceBadge } from '@/components/presence-indicator';
import { OpenChat, MessengerMessage } from '@/components/messenger/messenger-types';
import { useMessenger } from '@/components/messenger/messenger-context';
import { useSocket } from '@/lib/socket-context';

interface ChatWindowProps {
    chat: OpenChat;
    index: number;
    embedded?: boolean;
    onBack?: () => void;
}

export function ChatWindow({ chat, index, embedded = false, onBack }: ChatWindowProps) {
    const { data: session } = useSession();
    const { closeChat, refreshConversations } = useMessenger();
    const { joinConversation, leaveConversation, onNewMessage } = useSocket();
    const [messages, setMessages] = useState<MessengerMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);

    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAtBottom(atBottom);
        if (atBottom) setHasNewMessages(false);
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasNewMessages(false);
        setIsAtBottom(true);
    }, []);

    const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : 0;

    const loadMessages = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/messages?withUserId=${chat.conversationId}`);
            if (res.ok) {
                const data = await res.json();
                const msgs: MessengerMessage[] = (data.messages || []).map((m: any) => ({
                    id: m.id,
                    senderId: m.senderId,
                    content: m.content,
                    createdAt: new Date(m.createdAt),
                }));
                setMessages(msgs);
            }
        } catch (err: any) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoading(false);
        }
    }, [chat.conversationId]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        joinConversation(chat.conversationId);
        return () => leaveConversation(chat.conversationId);
    }, [chat.conversationId, joinConversation, leaveConversation]);

    useEffect(() => {
        const unsubscribe = onNewMessage((message: any) => {
            if (
                (message.senderId === chat.conversationId && message.recipientId === currentUserId) ||
                (message.senderId === currentUserId && message.recipientId === chat.conversationId)
            ) {
                setMessages((prev) => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, {
                        id: message.id,
                        senderId: message.senderId,
                        content: message.content,
                        createdAt: new Date(message.createdAt),
                    }];
                });
                refreshConversations();
            }
        });
        return unsubscribe;
    }, [chat.conversationId, currentUserId, onNewMessage, refreshConversations]);

    useEffect(() => {
        if (isAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else if (messages.length > 0) {
            setHasNewMessages(true);
        }
    }, [messages, isAtBottom]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId: chat.conversationId, content: newMessage }),
            });
            if (res.ok) {
                const inserted = await res.json();
                setMessages((prev) => [...prev, {
                    id: inserted.id,
                    senderId: inserted.senderId,
                    content: inserted.content,
                    createdAt: new Date(inserted.createdAt),
                }]);
                setNewMessage('');
                refreshConversations();
            }
        } catch (err: any) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Embedded mode for unified chat
    if (embedded) {
        return (
            <div className="h-full flex flex-col">
                {/* Header with back button */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                    {onBack && (
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <div className="relative">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={getMinecraftAvatarUrl(chat.user.minecraftUsername || chat.user.username)} />
                            <AvatarFallback className="text-xs">{getInitials(chat.user.username)}</AvatarFallback>
                        </Avatar>
                        <PresenceBadge lastSeenAt={chat.user.lastSeenAt} className="w-2.5 h-2.5" />
                    </div>
                    <span className="font-medium text-sm">{chat.user.username}</span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 relative" ref={messagesContainerRef} onScroll={handleScroll}>
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            No messages yet. Say hi! 👋
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isOwn = msg.senderId === currentUserId;
                            return (
                                <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                                    <div
                                        className={cn(
                                            'max-w-[75%] px-3 py-2 rounded-2xl text-sm',
                                            isOwn
                                                ? 'bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-br-md'
                                                : 'bg-secondary text-foreground rounded-bl-md'
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />

                    {!isAtBottom && messages.length > 0 && (
                        <button
                            onClick={scrollToBottom}
                            className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 p-2 bg-card hover:bg-secondary border border-neon-cyan/50 rounded-full shadow-lg transition-all hover:scale-110"
                        >
                            <ArrowDown className="w-4 h-4 text-neon-cyan" />
                            {hasNewMessages && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-cyan rounded-full animate-pulse" />
                            )}
                        </button>
                    )}
                </div>

                {/* Input */}
                <div className="p-2 border-t border-white/10">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            placeholder="Aa"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 h-8 text-sm rounded-full bg-secondary/50"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-neon-cyan hover:text-neon-cyan/80"
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sending}
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Original floating window mode (kept for backwards compat but not used)
    return null;
}

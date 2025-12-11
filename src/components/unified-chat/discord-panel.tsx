'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Loader2, MessageCircle, ExternalLink, ArrowDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getInitials } from '@/lib/utils';
import { useDiscordChat } from '@/components/discord-chat/discord-chat-context';
import { renderDiscordMarkdown } from '@/lib/discord-markdown';

const DISCORD_COLOR = '#5865F2';

interface DiscordPanelProps {
    isMobile: boolean;
}

export function DiscordPanel({ isMobile }: DiscordPanelProps) {
    const { data: session, status } = useSession();
    const {
        messages,
        isLoading,
        isSending,
        sendMessage,
        settings,
        refreshMessages,
    } = useDiscordChat();

    const [newMessage, setNewMessage] = useState('');
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

    useEffect(() => {
        if (isAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else if (messages.length > 0) {
            setHasNewMessages(true);
        }
    }, [messages, isAtBottom]);

    // Load messages when panel mounts
    useEffect(() => {
        if (settings.enabled && messages.length === 0) {
            refreshMessages();
        }
    }, [settings.enabled, messages.length, refreshMessages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return;
        const success = await sendMessage(newMessage);
        if (success) setNewMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!settings.enabled) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm p-4 text-center">
                <MessageCircle className="w-12 h-12 mb-2 opacity-50" style={{ color: DISCORD_COLOR }} />
                <p>Discord chat is not enabled</p>
            </div>
        );
    }

    const currentUserId = status === 'authenticated' && session?.user?.id
        ? parseInt(session.user.id as string)
        : null;

    return (
        <div className="h-full flex flex-col">
            {/* Channel info */}
            {settings.channelName && (
                <div className="px-3 py-2 border-b border-white/10 text-xs text-muted-foreground">
                    #{settings.channelName}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 relative" ref={messagesContainerRef} onScroll={handleScroll}>
                {isLoading || status === 'loading' ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: DISCORD_COLOR }} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                        <MessageCircle className="w-12 h-12 mb-2 opacity-50" style={{ color: DISCORD_COLOR }} />
                        <p>No messages yet</p>
                        <p className="text-xs mt-1">Say hi to the Discord community! 👋</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = currentUserId !== null && msg.isFromWeb && msg.webUserId === currentUserId;
                        return (
                            <div key={msg.id} className="group">
                                <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
                                    <Avatar className="w-8 h-8 flex-shrink-0">
                                        <AvatarImage src={msg.authorAvatar || undefined} />
                                        <AvatarFallback className="text-xs" style={{ background: DISCORD_COLOR }}>
                                            {getInitials(msg.authorName.replace('[WEB] ', ''))}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn('flex-1 min-w-0', isOwn && 'text-right')}>
                                        <div className={cn('flex items-center gap-2 mb-0.5', isOwn && 'flex-row-reverse')}>
                                            <span className={cn('font-medium text-xs', msg.isFromWeb ? 'text-neon-cyan' : '')} style={{ color: msg.isFromWeb ? undefined : DISCORD_COLOR }}>
                                                {msg.authorName}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div
                                            className={cn('text-sm break-words', isOwn ? 'text-foreground' : 'text-foreground/90')}
                                            dangerouslySetInnerHTML={{ __html: renderDiscordMarkdown(msg.content) }}
                                        />

                                        {/* Embeds */}
                                        {msg.embeds && msg.embeds.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                                {msg.embeds.map((embed: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="rounded-lg border border-border bg-secondary/50 p-3 text-left max-w-xs"
                                                        style={{ borderLeftColor: embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : DISCORD_COLOR, borderLeftWidth: '3px' }}
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                {embed.author && (
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        {embed.author.iconURL && (
                                                                            <img src={embed.author.iconURL} alt="" className="w-5 h-5 rounded-full" />
                                                                        )}
                                                                        <span className="text-xs font-medium">
                                                                            {embed.author.url ? (
                                                                                <a href={embed.author.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                                                    {embed.author.name}
                                                                                </a>
                                                                            ) : embed.author.name}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {embed.title && (
                                                                    <div className="font-semibold text-sm mb-1">
                                                                        {embed.url ? (
                                                                            <a href={embed.url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: DISCORD_COLOR }}>
                                                                                {embed.title}
                                                                            </a>
                                                                        ) : embed.title}
                                                                    </div>
                                                                )}
                                                                {embed.description && (
                                                                    <p className="text-xs text-muted-foreground mb-2">{embed.description}</p>
                                                                )}
                                                                {embed.fields && embed.fields.length > 0 && (
                                                                    <div className="grid gap-1 mt-2">
                                                                        {embed.fields.map((field: any, fi: number) => (
                                                                            <div key={fi} className={field.inline ? 'inline-block mr-4' : 'block'}>
                                                                                <div className="text-xs font-semibold text-foreground">{field.name}</div>
                                                                                <div className="text-xs text-muted-foreground">{field.value}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {embed.image?.url && (
                                                                    <img src={embed.image.url} alt="" className="mt-2 rounded max-h-40 max-w-full object-cover" />
                                                                )}
                                                                {embed.footer && (
                                                                    <div className="flex items-center gap-1 mt-2 pt-1 border-t border-border/50">
                                                                        {embed.footer.iconURL && (
                                                                            <img src={embed.footer.iconURL} alt="" className="w-4 h-4 rounded-full" />
                                                                        )}
                                                                        <span className="text-[10px] text-muted-foreground">{embed.footer.text}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {embed.thumbnail?.url && (
                                                                <div className="flex-shrink-0">
                                                                    <img src={embed.thumbnail.url} alt="" className="w-16 h-16 rounded object-cover" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Attachments */}
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {msg.attachments.map((att: any, i: number) => {
                                                    const isImage = att.contentType?.startsWith('image/') ||
                                                        /\.(png|jpg|jpeg|gif|webp)$/i.test(att.url || att.filename);
                                                    if (isImage) {
                                                        return (
                                                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                                                                <img src={att.url} alt={att.filename} className="rounded max-h-32 object-cover hover:opacity-80 transition-opacity" />
                                                            </a>
                                                        );
                                                    }
                                                    return (
                                                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-xs hover:bg-secondary/80">
                                                            <ExternalLink className="w-3 h-3" />
                                                            {att.filename || 'Attachment'}
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />

                {/* Scroll to bottom */}
                {!isAtBottom && messages.length > 0 && (
                    <button
                        onClick={scrollToBottom}
                        className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 p-2 bg-card hover:bg-secondary border border-border rounded-full shadow-lg transition-all hover:scale-110"
                        style={{ borderColor: DISCORD_COLOR }}
                    >
                        <ArrowDown className="w-4 h-4" style={{ color: DISCORD_COLOR }} />
                        {hasNewMessages && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ background: DISCORD_COLOR }} />
                        )}
                    </button>
                )}
            </div>

            {/* Input */}
            {session?.user ? (
                <div className="p-2 border-t border-white/10">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            placeholder="Message #discord-chat"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={2000}
                            className="flex-1 h-8 text-sm rounded-full bg-secondary/50"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            style={{ color: DISCORD_COLOR }}
                            onClick={handleSend}
                            disabled={!newMessage.trim() || isSending}
                        >
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 text-center">
                        Messages are sent to Discord as [WEB] {session.user.name}
                    </p>
                </div>
            ) : (
                <div className="p-3 border-t border-white/10 text-center text-xs text-muted-foreground">
                    Log in to send messages
                </div>
            )}
        </div>
    );
}

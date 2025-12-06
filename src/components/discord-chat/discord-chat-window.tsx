'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { X, Minus, Send, Loader2, MessageCircle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getInitials } from '@/lib/utils';
import { useDiscordChat } from './discord-chat-context';
import { renderDiscordMarkdown } from '@/lib/discord-markdown';

// Discord brand color
const DISCORD_COLOR = '#5865F2';

export function DiscordChatWindow() {
    const { data: session, status } = useSession();
    const {
        isOpen,
        setIsOpen,
        messages,
        isLoading,
        isSending,
        sendMessage,
        settings,
    } = useDiscordChat();

    const [minimized, setMinimized] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (!minimized && isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, minimized, isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && !minimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, minimized]);

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return;

        const success = await sendMessage(newMessage);
        if (success) {
            setNewMessage('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    // Use null when session is still loading to avoid false comparisons
    // This prevents all messages appearing on the wrong side during hydration
    const currentUserId = status === 'authenticated' && session?.user?.id
        ? parseInt(session.user.id as string)
        : null;

    return (
        <div
            className={cn(
                'fixed bottom-0 left-4 z-50 w-80 transition-all duration-300 ease-out',
                minimized ? 'h-12' : 'h-[28rem]'
            )}
        >
            <div className="h-full flex flex-col bg-card rounded-t-xl border border-white/10 shadow-lg overflow-hidden"
                style={{ boxShadow: `0 -4px 20px rgba(88, 101, 242, 0.2)` }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-3 py-2 cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${DISCORD_COLOR}33, ${DISCORD_COLOR}11)` }}
                    onClick={() => setMinimized(!minimized)}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: DISCORD_COLOR }}
                        >
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <span className="font-medium text-sm block truncate">Discord Chat</span>
                            {settings.channelName && (
                                <span className="text-xs text-muted-foreground">#{settings.channelName}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6"
                            onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 hover:text-error"
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Messages Area */}
                {!minimized && (
                    <>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                                    // Only mark messages as own when session is fully loaded and IDs match
                                    const isOwn = currentUserId !== null && msg.isFromWeb && msg.webUserId === currentUserId;

                                    return (
                                        <div key={msg.id} className="group">
                                            <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
                                                {/* Avatar */}
                                                <Avatar className="w-8 h-8 flex-shrink-0">
                                                    <AvatarImage src={msg.authorAvatar || undefined} />
                                                    <AvatarFallback className="text-xs" style={{ background: DISCORD_COLOR }}>
                                                        {getInitials(msg.authorName.replace('[WEB] ', ''))}
                                                    </AvatarFallback>
                                                </Avatar>

                                                {/* Message Content */}
                                                <div className={cn('flex-1 min-w-0', isOwn && 'text-right')}>
                                                    {/* Author & Time */}
                                                    <div className={cn('flex items-center gap-2 mb-0.5', isOwn && 'flex-row-reverse')}>
                                                        <span className={cn(
                                                            'font-medium text-xs',
                                                            msg.isFromWeb ? 'text-neon-cyan' : ''
                                                        )} style={{ color: msg.isFromWeb ? undefined : DISCORD_COLOR }}>
                                                            {msg.authorName}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    {/* Message Text */}
                                                    <div
                                                        className={cn(
                                                            'text-sm break-words',
                                                            isOwn ? 'text-foreground' : 'text-foreground/90'
                                                        )}
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
                                                                        {/* Main content */}
                                                                        <div className="flex-1 min-w-0">
                                                                            {/* Author */}
                                                                            {embed.author && (
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    {embed.author.iconURL && (
                                                                                        <img
                                                                                            src={embed.author.iconURL}
                                                                                            alt=""
                                                                                            className="w-5 h-5 rounded-full"
                                                                                        />
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

                                                                            {/* Title */}
                                                                            {embed.title && (
                                                                                <div className="font-semibold text-sm mb-1">
                                                                                    {embed.url ? (
                                                                                        <a href={embed.url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: DISCORD_COLOR }}>
                                                                                            {embed.title}
                                                                                        </a>
                                                                                    ) : embed.title}
                                                                                </div>
                                                                            )}

                                                                            {/* Description */}
                                                                            {embed.description && (
                                                                                <p className="text-xs text-muted-foreground mb-2">{embed.description}</p>
                                                                            )}

                                                                            {/* Fields */}
                                                                            {embed.fields && embed.fields.length > 0 && (
                                                                                <div className="grid gap-1 mt-2">
                                                                                    {embed.fields.map((field: any, fi: number) => (
                                                                                        <div
                                                                                            key={fi}
                                                                                            className={field.inline ? 'inline-block mr-4' : 'block'}
                                                                                        >
                                                                                            <div className="text-xs font-semibold text-foreground">{field.name}</div>
                                                                                            <div className="text-xs text-muted-foreground">{field.value}</div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* Image */}
                                                                            {embed.image?.url && (
                                                                                <img
                                                                                    src={embed.image.url}
                                                                                    alt=""
                                                                                    className="mt-2 rounded max-h-40 max-w-full object-cover"
                                                                                />
                                                                            )}

                                                                            {/* Footer */}
                                                                            {embed.footer && (
                                                                                <div className="flex items-center gap-1 mt-2 pt-1 border-t border-border/50">
                                                                                    {embed.footer.iconURL && (
                                                                                        <img
                                                                                            src={embed.footer.iconURL}
                                                                                            alt=""
                                                                                            className="w-4 h-4 rounded-full"
                                                                                        />
                                                                                    )}
                                                                                    <span className="text-[10px] text-muted-foreground">
                                                                                        {embed.footer.text}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Thumbnail */}
                                                                        {embed.thumbnail?.url && (
                                                                            <div className="flex-shrink-0">
                                                                                <img
                                                                                    src={embed.thumbnail.url}
                                                                                    alt=""
                                                                                    className="w-16 h-16 rounded object-cover"
                                                                                />
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
                                                                            <img
                                                                                src={att.url}
                                                                                alt={att.filename}
                                                                                className="rounded max-h-32 object-cover hover:opacity-80 transition-opacity"
                                                                            />
                                                                        </a>
                                                                    );
                                                                }

                                                                return (
                                                                    <a
                                                                        key={i}
                                                                        href={att.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-xs hover:bg-secondary/80"
                                                                    >
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
                        </div>

                        {/* Input Area */}
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
                                        {isSending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
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
                    </>
                )}
            </div>
        </div>
    );
}


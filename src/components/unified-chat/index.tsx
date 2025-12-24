'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, MessageSquare, ExternalLink, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MessengerProvider } from '@/components/messenger/messenger-context';
import { DiscordChatProvider } from '@/components/discord-chat/discord-chat-context';
import { MessengerPanel } from './messenger-panel';
import { DiscordPanel } from './discord-panel';
import { SupportPanel } from './support-panel';

const DISCORD_INVITE = 'https://discord.gg/TXmVwQB5p7';
const DISCORD_COLOR = '#5865F2';

type ChatMode = 'menu' | 'messenger' | 'discord' | 'support';

export function UnifiedChat() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [chatMode, setChatMode] = useState<ChatMode>('menu');
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Don't show on admin or panel pages
    const isAdminPage = pathname?.startsWith('/admin');
    const isPanelPage = pathname?.startsWith('/panel');
    if (isAdminPage || isPanelPage) return null;

    const handleClose = () => {
        setIsOpen(false);
        setChatMode('menu');
    };

    const handleBack = () => {
        setChatMode('menu');
    };

    const getTitle = () => {
        switch (chatMode) {
            case 'messenger': return 'Messenger';
            case 'discord': return 'Discord';
            case 'support': return 'Support';
            default: return 'Chat';
        }
    };

    // Mobile fullscreen container
    const containerClasses = isMobile && isOpen
        ? 'fixed inset-0 z-50 bg-background flex flex-col'
        : 'fixed bottom-4 right-4 z-50';

    // Panel container for desktop
    const panelClasses = isMobile
        ? 'flex-1 flex flex-col overflow-hidden'
        : 'w-80 h-[32rem] bg-card rounded-xl border border-white/10 shadow-lg overflow-hidden flex flex-col mb-2';

    return (
        <MessengerProvider>
            <DiscordChatProvider>
                <div className={containerClasses}>
                    {/* Chat Panel */}
                    {isOpen && (
                        <div className={panelClasses}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    {chatMode !== 'menu' && (
                                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleBack}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </Button>
                                    )}
                                    <h3 className="font-semibold gradient-text">
                                        {getTitle()}
                                    </h3>
                                </div>
                                <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-error" onClick={handleClose}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden">
                                {chatMode === 'menu' && (
                                    <div className="h-full flex flex-col p-4 gap-3">
                                        {/* Support Option - Featured at top */}
                                        <button
                                            onClick={() => setChatMode('support')}
                                            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-neon-pink/15 to-neon-purple/15 border border-neon-pink/30 hover:border-neon-pink/50 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-neon-pink/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Ticket className="w-6 h-6 text-neon-pink" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold">Get Support</p>
                                                <p className="text-sm text-muted-foreground">We&apos;re here to help</p>
                                            </div>
                                        </button>

                                        {/* Messenger Option */}
                                        {session?.user ? (
                                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border border-white/10 hover:border-neon-cyan/50 transition-all group">
                                                <button
                                                    onClick={() => setChatMode('messenger')}
                                                    className="flex items-center gap-4 flex-1"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <MessageSquare className="w-6 h-6 text-neon-cyan" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-semibold">Messenger</p>
                                                        <p className="text-sm text-muted-foreground">Chat with friends</p>
                                                    </div>
                                                </button>
                                                <a
                                                    href="/messages"
                                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                                    title="Open in full page"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-neon-cyan" />
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-white/5">
                                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                                                    <MessageSquare className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-semibold text-muted-foreground">Messenger</p>
                                                    <p className="text-sm text-muted-foreground">Log in to chat</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Discord Option */}
                                        {/* Discord Option */}
                                        <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-[#5865F2]/50 transition-all group"
                                            style={{ background: `linear-gradient(135deg, ${DISCORD_COLOR}15, ${DISCORD_COLOR}05)` }}>
                                            <button
                                                onClick={() => setChatMode('discord')}
                                                className="flex items-center gap-4 flex-1"
                                            >
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                                                    style={{ background: `${DISCORD_COLOR}30` }}
                                                >
                                                    <svg className="w-6 h-6" style={{ color: DISCORD_COLOR }} viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                                    </svg>
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-semibold">Discord Chat</p>
                                                    <p className="text-sm text-muted-foreground">Community chat</p>
                                                </div>
                                            </button>
                                            <a
                                                href={DISCORD_INVITE}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                                title="Join Discord Server"
                                            >
                                                <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-[#5865F2]" />
                                            </a>
                                        </div>

                                        {/* Join Discord Link */}
                                        <a
                                            href={DISCORD_INVITE}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 p-3 mt-auto rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm"
                                        >
                                            <ExternalLink className="w-4 h-4" style={{ color: DISCORD_COLOR }} />
                                            <span>Join our Discord Server</span>
                                        </a>
                                    </div>
                                )}

                                {chatMode === 'messenger' && <MessengerPanel isMobile={isMobile} />}
                                {chatMode === 'discord' && <DiscordPanel isMobile={isMobile} />}
                                {chatMode === 'support' && <SupportPanel isMobile={isMobile} onBack={handleBack} />}
                            </div>
                        </div>
                    )}

                    {/* FAB Button - only show when not open or on desktop */}
                    {(!isOpen || !isMobile) && (
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={cn(
                                'w-14 h-14 rounded-full flex items-center justify-center transition-all',
                                'bg-gradient-to-br from-neon-cyan to-neon-purple shadow-lg hover:scale-110',
                                'border border-white/20',
                                isOpen && 'rotate-90'
                            )}
                        >
                            {isOpen ? (
                                <X className="w-6 h-6 text-white" />
                            ) : (
                                <MessageCircle className="w-6 h-6 text-white" />
                            )}
                        </button>
                    )}
                </div>
            </DiscordChatProvider>
        </MessengerProvider>
    );
}

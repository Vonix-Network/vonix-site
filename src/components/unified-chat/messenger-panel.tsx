'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Search, MessageSquare, Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn, getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';
import { PresenceBadge } from '@/components/presence-indicator';
import { useMessenger } from '@/components/messenger/messenger-context';
import { MessengerUser } from '@/components/messenger/messenger-types';
import { ChatWindow } from './chat-window';

interface MessengerPanelProps {
    isMobile: boolean;
}

export function MessengerPanel({ isMobile }: MessengerPanelProps) {
    const { data: session } = useSession();
    const { conversations, openChats, openChat, refreshConversations } = useMessenger();
    const [friends, setFriends] = useState<MessengerUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'chats' | 'friends'>('chats');
    const [selectedChat, setSelectedChat] = useState<MessengerUser | null>(null);

    const loadFriends = useCallback(async () => {
        try {
            const res = await fetch('/api/friends');
            if (res.ok) {
                const data = await res.json();
                const friendList: MessengerUser[] = (data.friends || []).map((f: any) => ({
                    id: f.id,
                    username: f.username,
                    minecraftUsername: f.minecraftUsername,
                    lastSeenAt: f.lastSeen,
                }));
                setFriends(friendList);
            }
        } catch (err: any) {
            console.error('Failed to load friends:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user) {
            refreshConversations();
            loadFriends();
        }
    }, [session?.user, refreshConversations, loadFriends]);

    // If a chat is selected in mobile, show full chat
    if (selectedChat) {
        const chatData = openChats.find((c: any) => c.user.id === selectedChat.id);
        if (chatData) {
            return (
                <div className="h-full flex flex-col">
                    <ChatWindow
                        chat={chatData}
                        index={0}
                        embedded={true}
                        onBack={() => setSelectedChat(null)}
                    />
                </div>
            );
        }
    }

    const handleOpenChat = (user: MessengerUser) => {
        openChat(user);
        if (isMobile) {
            setSelectedChat(user);
        }
    };

    const filteredConversations = conversations.filter((c: any) =>
        c.user.username.toLowerCase().includes(search.toLowerCase())
    );

    const filteredFriends = friends.filter((f: any) =>
        f.username.toLowerCase().includes(search.toLowerCase()) &&
        !conversations.some((c: any) => c.user.id === f.id)
    );

    return (
        <div className="h-full flex flex-col">
            {/* Search */}
            <div className="p-2 border-b border-white/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-8 text-sm rounded-full bg-secondary/50"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('chats')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors',
                        activeTab === 'chats' ? 'text-neon-cyan border-b-2 border-neon-cyan' : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <MessageSquare className="w-4 h-4" />
                    Chats
                </button>
                <button
                    onClick={() => setActiveTab('friends')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors',
                        activeTab === 'friends' ? 'text-neon-cyan border-b-2 border-neon-cyan' : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <Users className="w-4 h-4" />
                    Friends
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                    </div>
                ) : activeTab === 'chats' ? (
                    filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center">
                            <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
                            No conversations yet
                        </div>
                    ) : (
                        filteredConversations.map((conv: any) => (
                            <ContactItem
                                key={conv.id}
                                user={conv.user}
                                subtitle={conv.lastMessage}
                                time={conv.lastMessageTime}
                                onClick={() => handleOpenChat(conv.user)}
                            />
                        ))
                    )
                ) : filteredFriends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center">
                        <Users className="w-10 h-10 mb-2 opacity-50" />
                        No friends to message
                    </div>
                ) : (
                    filteredFriends.map((friend: any) => (
                        <ContactItem
                            key={friend.id}
                            user={friend}
                            subtitle="Start a conversation"
                            onClick={() => handleOpenChat(friend)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

interface ContactItemProps {
    user: MessengerUser;
    subtitle: string;
    time?: Date;
    onClick: () => void;
}

function ContactItem({ user, subtitle, time, onClick }: ContactItemProps) {
    return (
        <button onClick={onClick} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left">
            <div className="relative">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={getMinecraftAvatarUrl(user.minecraftUsername || user.username)} />
                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                </Avatar>
                <PresenceBadge lastSeenAt={user.lastSeenAt} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{user.username}</span>
                    {time && <span className="text-xs text-muted-foreground">{formatRelativeTime(time)}</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
        </button>
    );
}

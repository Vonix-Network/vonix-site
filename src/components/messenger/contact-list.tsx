'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { X, Search, MessageSquare, Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';
import { PresenceBadge } from '@/components/presence-indicator';
import { useMessenger } from './messenger-context';
import { MessengerUser } from './messenger-types';

export function ContactList() {
  const { data: session } = useSession();
  const { conversations, showContactList, setShowContactList, openChat, refreshConversations } = useMessenger();
  const [friends, setFriends] = useState<MessengerUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends'>('chats');

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
    if (session?.user && showContactList) {
      refreshConversations();
      loadFriends();
    }
  }, [session?.user, showContactList, refreshConversations, loadFriends]);

  if (!showContactList) return null;

  const filteredConversations = conversations.filter((c) =>
    c.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase()) &&
    !conversations.some((c) => c.user.id === f.id)
  );

  return (
    <div className="fixed bottom-0 right-4 z-50 w-80 h-[28rem] bg-card rounded-t-xl border border-white/10 shadow-neon flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border-b border-white/10">
        <h3 className="font-semibold gradient-text">Messenger</h3>
        <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-error" onClick={() => setShowContactList(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

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
            filteredConversations.map((conv) => (
              <ContactItem key={conv.id} user={conv.user} subtitle={conv.lastMessage} time={conv.lastMessageTime} onClick={() => openChat(conv.user)} />
            ))
          )
        ) : filteredFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center">
            <Users className="w-10 h-10 mb-2 opacity-50" />
            No friends to message
          </div>
        ) : (
          filteredFriends.map((friend) => (
            <ContactItem key={friend.id} user={friend} subtitle="Start a conversation" onClick={() => openChat(friend)} />
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



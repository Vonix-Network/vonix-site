'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MessageSquare, Send, Search, Plus,
  MoreHorizontal, Phone, Video, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';

interface Conversation {
  id: number;
  user: { id: number; username: string; minecraftUsername: string | null; status: 'online' | 'offline' };
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
}

interface Message {
  id: number;
  senderId: number;
  content: string;
  time: Date;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const myId = user?.id ? parseInt(user.id as string) : 0;

  // Track if we need to auto-select first conversation
  const [needsAutoSelect, setNeedsAutoSelect] = useState(false);
  const [firstConversation, setFirstConversation] = useState<Conversation | null>(null);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await fetch('/api/messages');
      if (!res.ok) {
        console.error('Failed to load conversations', await res.text());
        return;
      }
      const data = await res.json();
      const convs: Conversation[] = (data.conversations || []).map((c: any) => ({
        id: c.user.id,
        user: {
          id: c.user.id,
          username: c.user.username,
          minecraftUsername: c.user.minecraftUsername,
          status: 'offline',
        },
        lastMessage: c.lastMessage,
        lastMessageTime: new Date(c.lastMessageTime),
        unread: 0,
      }));
      setConversations(convs);

      // If no conversation selected and we have conversations, mark for auto-select
      if (!selectedConversation && convs.length > 0 && !searchParams.get('withUserId')) {
        setFirstConversation(convs[0]);
        setNeedsAutoSelect(true);
      }
    } catch (err) {
      console.error('Error loading conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Load messages only, without setting selectedConversation
  const loadMessagesForUser = async (otherUserId: number) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/messages?withUserId=${otherUserId}`);
      if (!res.ok) {
        console.error('Failed to load messages', await res.text());
        return;
      }
      const data = await res.json();
      const msgs: Message[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
        time: new Date(m.createdAt),
      }));
      setMessages(msgs);
    } catch (err) {
      console.error('Error loading messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Select a conversation and load its messages
  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    // Update URL without full navigation
    router.replace(`/messages?withUserId=${conv.user.id}`, { scroll: false });
    await loadMessagesForUser(conv.user.id);
  };

  // Open conversation by user ID (for withUserId param or new chats)
  const openConversationByUserId = async (otherUserId: number) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/messages?withUserId=${otherUserId}`);
      if (!res.ok) {
        console.error('Failed to load messages', await res.text());
        return;
      }
      const data = await res.json();
      const msgs: Message[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
        time: new Date(m.createdAt),
      }));
      setMessages(msgs);

      let conv = conversations.find((c) => c.user.id === otherUserId) || null;
      if (!conv) {
        // Fetch basic user info to build a conversation header
        const userRes = await fetch(`/api/users/${otherUserId}`);
        if (userRes.ok) {
          const u = await userRes.json();
          conv = {
            id: u.id,
            user: {
              id: u.id,
              username: u.username,
              minecraftUsername: u.minecraftUsername ?? null,
              status: 'offline',
            },
            lastMessage: msgs[msgs.length - 1]?.content ?? '',
            lastMessageTime: msgs[msgs.length - 1]?.time ?? new Date(),
            unread: 0,
          };
          setConversations((prev) => {
            if (prev.find((c) => c.user.id === u.id)) return prev;
            return [conv as Conversation, ...prev];
          });
        }
      }

      if (conv) setSelectedConversation(conv);
    } catch (err) {
      console.error('Error loading conversation', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-select first conversation when needed
  useEffect(() => {
    if (needsAutoSelect && firstConversation) {
      selectConversation(firstConversation);
      setNeedsAutoSelect(false);
      setFirstConversation(null);
    }
  }, [needsAutoSelect, firstConversation]);

  // Handle initial load via URL param
  useEffect(() => {
    const withUserId = searchParams.get('withUserId');
    if (withUserId) {
      const idNum = parseInt(withUserId);
      if (!Number.isNaN(idNum)) {
        openConversationByUserId(idNum);
      }
    }
  }, [searchParams]);

  // Poll for new messages every 5 seconds when a conversation is open
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?withUserId=${selectedConversation.user.id}`);
        if (res.ok) {
          const data = await res.json();
          const msgs: Message[] = (data.messages || []).map((m: any) => ({
            id: m.id,
            senderId: m.senderId,
            content: m.content,
            time: new Date(m.createdAt),
          }));
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Error polling messages', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedConversation?.user.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selectedConversation.user.id, content: newMessage }),
      });
      if (!res.ok) {
        console.error('Failed to send message', await res.text());
        return;
      }
      const inserted = await res.json();
      const msg: Message = {
        id: inserted.id,
        senderId: inserted.senderId,
        content: inserted.content,
        time: new Date(inserted.createdAt),
      };
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.user.id === selectedConversation.user.id
            ? { ...c, lastMessage: msg.content, lastMessageTime: msg.time }
            : c,
        );
        // If conversation wasn't in the list yet, add it
        if (!updated.find((c) => c.user.id === selectedConversation.user.id)) {
          return [
            {
              id: selectedConversation.user.id,
              user: selectedConversation.user,
              lastMessage: msg.content,
              lastMessageTime: msg.time,
              unread: 0,
            },
            ...updated,
          ];
        }
        return updated;
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations List */}
        <Card variant="glass" className="lg:col-span-1 flex flex-col">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-neon-cyan" />
                Messages
              </CardTitle>
              <Button variant="ghost" size="icon">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-secondary/50' : ''
                    }`}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage
                        src={getMinecraftAvatarUrl(conv.user.minecraftUsername || conv.user.username)}
                        alt={conv.user.username}
                      />
                      <AvatarFallback>
                        {getInitials(conv.user.username)}
                      </AvatarFallback>
                    </Avatar>
                    {conv.user.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{conv.user.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                  </div>

                  {conv.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-neon-cyan text-xs flex items-center justify-center text-background font-bold">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card variant="glass" className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={getMinecraftAvatarUrl(selectedConversation.user.minecraftUsername || selectedConversation.user.username)}
                        alt={selectedConversation.user.username}
                      />
                      <AvatarFallback>
                        {getInitials(selectedConversation.user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedConversation.user.username}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.user.status === 'online' ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" disabled>
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled>
                      <Video className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Info className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === myId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${message.senderId === myId
                        ? 'bg-neon-cyan text-background rounded-br-sm'
                        : 'bg-secondary rounded-bl-sm'
                        }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${message.senderId === myId ? 'text-background/70' : 'text-muted-foreground'
                        }`}>
                        {message.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button
                    variant="gradient"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-bold mb-2">Select a Conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

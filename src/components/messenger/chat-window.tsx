'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { X, Minus, Send, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getMinecraftAvatarUrl, getInitials } from '@/lib/utils';
import { PresenceBadge } from '@/components/presence-indicator';
import { OpenChat, MessengerMessage } from './messenger-types';
import { useMessenger } from './messenger-context';

interface ChatWindowProps {
  chat: OpenChat;
  index: number;
}

export function ChatWindow({ chat, index }: ChatWindowProps) {
  const { data: session } = useSession();
  const { closeChat, toggleMinimize, refreshConversations } = useMessenger();
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : 0;
  const rightOffset = 320 + index * 340;

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
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [chat.conversationId]);

  useEffect(() => {
    if (!chat.minimized) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [chat.minimized, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chat.minimized) {
      inputRef.current?.focus();
    }
  }, [chat.minimized]);

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
    } catch (err) {
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

  return (
    <div
      className={cn(
        'fixed bottom-0 z-50 w-80 transition-all duration-300 ease-out',
        chat.minimized ? 'h-12' : 'h-96'
      )}
      style={{ right: `${rightOffset}px` }}
    >
      <div className="h-full flex flex-col bg-card rounded-t-xl border border-white/10 shadow-neon overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border-b border-white/10 cursor-pointer"
          onClick={() => toggleMinimize(chat.conversationId)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <Avatar className="w-7 h-7">
                <AvatarImage src={getMinecraftAvatarUrl(chat.user.minecraftUsername || chat.user.username)} />
                <AvatarFallback className="text-xs">{getInitials(chat.user.username)}</AvatarFallback>
              </Avatar>
              <PresenceBadge lastSeenAt={chat.user.lastSeenAt} className="w-2.5 h-2.5" />
            </div>
            <span className="font-medium text-sm truncate">{chat.user.username}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={(e) => { e.stopPropagation(); toggleMinimize(chat.conversationId); }}>
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6 hover:text-error" onClick={(e) => { e.stopPropagation(); closeChat(chat.conversationId); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        {!chat.minimized && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
            </div>

            {/* Input Area */}
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
          </>
        )}
      </div>
    </div>
  );
}


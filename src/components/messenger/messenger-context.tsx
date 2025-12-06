'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MessengerConversation, MessengerUser, OpenChat } from './messenger-types';

interface MessengerContextType {
  conversations: MessengerConversation[];
  openChats: OpenChat[];
  showContactList: boolean;
  setShowContactList: (show: boolean) => void;
  openChat: (user: MessengerUser) => void;
  closeChat: (conversationId: number) => void;
  toggleMinimize: (conversationId: number) => void;
  refreshConversations: () => Promise<void>;
  totalUnread: number;
}

const MessengerContext = createContext<MessengerContextType | null>(null);

export function useMessenger() {
  const context = useContext(MessengerContext);
  if (!context) {
    throw new Error('useMessenger must be used within MessengerProvider');
  }
  return context;
}

const MAX_OPEN_CHATS = 3;

export function MessengerProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const [showContactList, setShowContactList] = useState(false);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        const convs: MessengerConversation[] = (data.conversations || []).map((c: any) => ({
          id: c.user.id,
          user: {
            id: c.user.id,
            username: c.user.username,
            minecraftUsername: c.user.minecraftUsername,
          },
          lastMessage: c.lastMessage,
          lastMessageTime: new Date(c.lastMessageTime),
          unreadCount: 0,
        }));
        setConversations(convs);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  const openChat = useCallback((user: MessengerUser) => {
    setOpenChats((prev) => {
      const existing = prev.find((c) => c.conversationId === user.id);
      if (existing) {
        return prev.map((c) =>
          c.conversationId === user.id ? { ...c, minimized: false } : c
        );
      }
      const newChat: OpenChat = { conversationId: user.id, user, minimized: false };
      const updated = [...prev, newChat];
      if (updated.length > MAX_OPEN_CHATS) {
        return updated.slice(-MAX_OPEN_CHATS);
      }
      return updated;
    });
    setShowContactList(false);
  }, []);

  const closeChat = useCallback((conversationId: number) => {
    setOpenChats((prev) => prev.filter((c) => c.conversationId !== conversationId));
  }, []);

  const toggleMinimize = useCallback((conversationId: number) => {
    setOpenChats((prev) =>
      prev.map((c) =>
        c.conversationId === conversationId ? { ...c, minimized: !c.minimized } : c
      )
    );
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <MessengerContext.Provider
      value={{
        conversations,
        openChats,
        showContactList,
        setShowContactList,
        openChat,
        closeChat,
        toggleMinimize,
        refreshConversations,
        totalUnread,
      }}
    >
      {children}
    </MessengerContext.Provider>
  );
}



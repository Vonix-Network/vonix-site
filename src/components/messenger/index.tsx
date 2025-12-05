'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MessengerProvider, useMessenger } from './messenger-context';
import { MessengerBar } from './messenger-bar';
import { ContactList } from './contact-list';
import { ChatWindow } from './chat-window';

function MessengerContent() {
  const { data: session } = useSession();
  const { openChats, refreshConversations } = useMessenger();

  useEffect(() => {
    if (session?.user) {
      refreshConversations();
      // Refresh conversations periodically
      const interval = setInterval(refreshConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user, refreshConversations]);

  if (!session?.user) return null;

  return (
    <>
      <MessengerBar />
      <ContactList />
      {openChats.map((chat, index) => (
        <ChatWindow key={chat.conversationId} chat={chat} index={index} />
      ))}
    </>
  );
}

export function Messenger() {
  return (
    <MessengerProvider>
      <MessengerContent />
    </MessengerProvider>
  );
}

export { MessengerProvider, useMessenger } from './messenger-context';


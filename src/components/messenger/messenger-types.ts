export interface MessengerUser {
  id: number;
  username: string;
  minecraftUsername: string | null;
  lastSeenAt?: string | null;
}

export interface MessengerConversation {
  id: number;
  user: MessengerUser;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export interface MessengerMessage {
  id: number;
  senderId: number;
  content: string;
  createdAt: Date;
}

export interface OpenChat {
  conversationId: number;
  user: MessengerUser;
  minimized: boolean;
}



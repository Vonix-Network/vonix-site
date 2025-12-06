'use client';

import { DiscordChatProvider } from './discord-chat-context';
import { DiscordChatBar } from './discord-chat-bar';
import { DiscordChatWindow } from './discord-chat-window';

export function DiscordChat() {
    return (
        <DiscordChatProvider>
            <DiscordChatBar />
            <DiscordChatWindow />
        </DiscordChatProvider>
    );
}

export { DiscordChatProvider, useDiscordChat } from './discord-chat-context';


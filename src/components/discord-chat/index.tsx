'use client';

import { DiscordChatProvider } from './discord-chat-context';
import { DiscordChatWindow } from './discord-chat-window';

// DiscordChat now only uses the DiscordChatWindow which starts minimized
// The separate bar button has been removed - just the header of the window acts as the toggle
export function DiscordChat() {
    return (
        <DiscordChatProvider>
            <DiscordChatWindow />
        </DiscordChatProvider>
    );
}

export { DiscordChatProvider, useDiscordChat } from './discord-chat-context';

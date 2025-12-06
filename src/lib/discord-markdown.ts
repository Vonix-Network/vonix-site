/**
 * Discord Markdown Parser
 * 
 * Parses Discord-style formatting into HTML/React-compatible output
 * Supports: Bold, Italic, Underline, Strikethrough, Code, Links, Emoji codes
 */

// Common Discord emoji codes mapping
const EMOJI_MAP: Record<string, string> = {
    // Faces
    ':smile:': '😄', ':grinning:': '😀', ':joy:': '😂', ':rofl:': '🤣',
    ':wink:': '😉', ':blush:': '😊', ':heart_eyes:': '😍', ':kissing_heart:': '😘',
    ':thinking:': '🤔', ':neutral_face:': '😐', ':expressionless:': '😑',
    ':unamused:': '😒', ':sweat:': '😓', ':pensive:': '😔', ':confused:': '😕',
    ':confounded:': '😖', ':disappointed:': '😞', ':worried:': '😟',
    ':angry:': '😠', ':rage:': '😡', ':cry:': '😢', ':sob:': '😭',
    ':frowning:': '☹️', ':anguished:': '😧', ':fearful:': '😨',
    ':weary:': '😩', ':exploding_head:': '🤯', ':flushed:': '😳',
    ':scream:': '😱', ':cold_sweat:': '😰', ':skull:': '💀',
    ':smiling_imp:': '😈', ':sunglasses:': '😎', ':nerd:': '🤓',
    ':clown:': '🤡', ':cowboy:': '🤠', ':partying_face:': '🥳',
    ':pleading_face:': '🥺', ':yawning_face:': '🥱',

    // Gestures
    ':thumbsup:': '👍', ':thumbs_up:': '👍', ':+1:': '👍',
    ':thumbsdown:': '👎', ':thumbs_down:': '👎', ':-1:': '👎',
    ':wave:': '👋', ':clap:': '👏', ':raised_hands:': '🙌',
    ':pray:': '🙏', ':handshake:': '🤝', ':muscle:': '💪',
    ':ok_hand:': '👌', ':point_up:': '☝️', ':point_down:': '👇',
    ':point_left:': '👈', ':point_right:': '👉', ':middle_finger:': '🖕',
    ':fist:': '✊', ':punch:': '👊', ':v:': '✌️', ':metal:': '🤘',

    // Hearts
    ':heart:': '❤️', ':orange_heart:': '🧡', ':yellow_heart:': '💛',
    ':green_heart:': '💚', ':blue_heart:': '💙', ':purple_heart:': '💜',
    ':black_heart:': '🖤', ':white_heart:': '🤍', ':broken_heart:': '💔',
    ':sparkling_heart:': '💖', ':heartbeat:': '💓', ':heartpulse:': '💗',
    ':two_hearts:': '💕', ':revolving_hearts:': '💞', ':cupid:': '💘',
    ':gift_heart:': '💝', ':heart_decoration:': '💟',

    // Animals
    ':dog:': '🐶', ':cat:': '🐱', ':mouse:': '🐭', ':hamster:': '🐹',
    ':rabbit:': '🐰', ':fox:': '🦊', ':bear:': '🐻', ':panda_face:': '🐼',
    ':koala:': '🐨', ':tiger:': '🐯', ':lion:': '🦁', ':cow:': '🐮',
    ':pig:': '🐷', ':frog:': '🐸', ':monkey_face:': '🐵', ':chicken:': '🐔',
    ':penguin:': '🐧', ':bird:': '🐦', ':eagle:': '🦅', ':duck:': '🦆',
    ':owl:': '🦉', ':bat:': '🦇', ':wolf:': '🐺', ':horse:': '🐴',
    ':unicorn:': '🦄', ':bee:': '🐝', ':bug:': '🐛', ':butterfly:': '🦋',
    ':snail:': '🐌', ':snake:': '🐍', ':dragon:': '🐉', ':dinosaur:': '🦕',
    ':whale:': '🐋', ':dolphin:': '🐬', ':fish:': '🐟', ':shark:': '🦈',
    ':octopus:': '🐙', ':crab:': '🦀', ':shrimp:': '🦐', ':squid:': '🦑',

    // Objects & Symbols
    ':fire:': '🔥', ':star:': '⭐', ':sparkles:': '✨', ':zap:': '⚡',
    ':boom:': '💥', ':snowflake:': '❄️', ':cloud:': '☁️', ':sun:': '☀️',
    ':moon:': '🌙', ':rainbow:': '🌈', ':umbrella:': '☂️',
    ':trophy:': '🏆', ':medal:': '🏅', ':crown:': '👑', ':gem:': '💎',
    ':ring:': '💍', ':gift:': '🎁', ':balloon:': '🎈', ':tada:': '🎉',
    ':confetti_ball:': '🎊', ':party_popper:': '🎉', ':ghost:': '👻',
    ':robot:': '🤖', ':alien:': '👽', ':space_invader:': '👾',
    ':video_game:': '🎮', ':joystick:': '🕹️', ':game_die:': '🎲',
    ':dart:': '🎯', ':bowling:': '🎳', ':guitar:': '🎸', ':microphone:': '🎤',
    ':headphones:': '🎧', ':musical_note:': '🎵', ':notes:': '🎶',
    ':bell:': '🔔', ':megaphone:': '📣', ':speech_balloon:': '💬',
    ':100:': '💯', ':checkmark:': '✅', ':check:': '✔️', ':x:': '❌',
    ':warning:': '⚠️', ':no_entry:': '⛔', ':stop_sign:': '🛑',
    ':question:': '❓', ':exclamation:': '❗', ':interrobang:': '⁉️',

    // Food & Drink
    ':apple:': '🍎', ':pizza:': '🍕', ':hamburger:': '🍔', ':fries:': '🍟',
    ':hotdog:': '🌭', ':taco:': '🌮', ':burrito:': '🌯', ':sushi:': '🍣',
    ':cookie:': '🍪', ':cake:': '🎂', ':icecream:': '🍦', ':doughnut:': '🍩',
    ':chocolate_bar:': '🍫', ':candy:': '🍬', ':lollipop:': '🍭',
    ':coffee:': '☕', ':tea:': '🍵', ':beer:': '🍺', ':beers:': '🍻',
    ':wine_glass:': '🍷', ':cocktail:': '🍸', ':tropical_drink:': '🍹',

    // Gaming
    ':crossed_swords:': '⚔️', ':shield:': '🛡️',
    ':bow_and_arrow:': '🏹', ':axe:': '🪓', ':pick:': '⛏️', ':hammer:': '🔨',
    ':wrench:': '🔧', ':gear:': '⚙️', ':chains:': '⛓️', ':bomb:': '💣',
    ':magic_wand:': '🪄', ':crystal_ball:': '🔮', ':scroll:': '📜',
    ':map:': '🗺️', ':compass:': '🧭', ':globe:': '🌍', ':rocket:': '🚀',
};

interface ParsedPart {
    type: 'text' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'codeblock' | 'link' | 'emoji' | 'mention' | 'channel';
    content: string;
    url?: string;
    language?: string;
}

/**
 * Parse Discord-style markdown into parts
 */
export function parseDiscordMarkdown(text: string): ParsedPart[] {
    const parts: ParsedPart[] = [];
    let remaining = text;

    // Regex patterns for Discord formatting
    const patterns = [
        // Code blocks (```language\ncode```)
        { regex: /```(\w+)?\n?([\s\S]*?)```/g, type: 'codeblock' as const },
        // Inline code (`code`)
        { regex: /`([^`]+)`/g, type: 'code' as const },
        // Bold + Italic (***text***)
        { regex: /\*\*\*(.+?)\*\*\*/g, type: 'bold' as const, nested: 'italic' },
        // Bold (**text**)
        { regex: /\*\*(.+?)\*\*/g, type: 'bold' as const },
        // Underline + Italic (__*text*__)
        { regex: /__\*(.+?)\*__/g, type: 'underline' as const, nested: 'italic' },
        // Underline (__text__)
        { regex: /__(.+?)__/g, type: 'underline' as const },
        // Italic (*text* or _text_)
        { regex: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, type: 'italic' as const },
        { regex: /(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, type: 'italic' as const },
        // Strikethrough (~~text~~)
        { regex: /~~(.+?)~~/g, type: 'strikethrough' as const },
        // Links [text](url)
        { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' as const },
        // User mentions <@123456> or <@!123456>
        { regex: /<@!?(\d+)>/g, type: 'mention' as const },
        // Channel mentions <#123456>
        { regex: /<#(\d+)>/g, type: 'channel' as const },
        // Emoji codes :emoji:
        { regex: /:([a-zA-Z0-9_+-]+):/g, type: 'emoji' as const },
        // Custom Discord emojis <:name:id> or <a:name:id>
        { regex: /<a?:(\w+):(\d+)>/g, type: 'emoji' as const },
    ];

    // Simple approach: process text left to right looking for patterns
    let cursor = 0;
    const matches: { start: number; end: number; part: ParsedPart }[] = [];

    for (const pattern of patterns) {
        const regex = new RegExp(pattern.regex.source, 'g');
        let match;
        while ((match = regex.exec(text)) !== null) {
            let part: ParsedPart;

            if (pattern.type === 'codeblock') {
                part = {
                    type: 'codeblock',
                    content: match[2] || '',
                    language: match[1] || undefined,
                };
            } else if (pattern.type === 'link') {
                part = {
                    type: 'link',
                    content: match[1],
                    url: match[2],
                };
            } else if (pattern.type === 'emoji') {
                // Check if it's a custom Discord emoji
                if (match[2]) {
                    // Custom emoji - create URL
                    const isAnimated = match[0].startsWith('<a:');
                    const emojiId = match[2];
                    part = {
                        type: 'emoji',
                        content: match[1],
                        url: `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=24`,
                    };
                } else {
                    // Standard emoji code
                    const emoji = EMOJI_MAP[`:${match[1]}:`] || `:${match[1]}:`;
                    part = {
                        type: 'emoji',
                        content: emoji,
                    };
                }
            } else if (pattern.type === 'mention') {
                part = {
                    type: 'mention',
                    content: `@User`,
                };
            } else if (pattern.type === 'channel') {
                part = {
                    type: 'channel',
                    content: `#channel`,
                };
            } else {
                part = {
                    type: pattern.type,
                    content: match[1],
                };
            }

            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                part,
            });
        }
    }

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep first match)
    const filteredMatches: typeof matches = [];
    let lastEnd = 0;
    for (const match of matches) {
        if (match.start >= lastEnd) {
            filteredMatches.push(match);
            lastEnd = match.end;
        }
    }

    // Build parts array
    cursor = 0;
    for (const match of filteredMatches) {
        // Add text before this match
        if (match.start > cursor) {
            parts.push({
                type: 'text',
                content: text.slice(cursor, match.start),
            });
        }
        parts.push(match.part);
        cursor = match.end;
    }

    // Add remaining text
    if (cursor < text.length) {
        parts.push({
            type: 'text',
            content: text.slice(cursor),
        });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

/**
 * Convert parsed parts to HTML string
 */
export function partsToHtml(parts: ParsedPart[]): string {
    return parts.map(part => {
        const escaped = escapeHtml(part.content);

        switch (part.type) {
            case 'bold':
                return `<strong>${escaped}</strong>`;
            case 'italic':
                return `<em>${escaped}</em>`;
            case 'underline':
                return `<u>${escaped}</u>`;
            case 'strikethrough':
                return `<del>${escaped}</del>`;
            case 'code':
                return `<code class="px-1 py-0.5 rounded bg-secondary text-neon-cyan">${escaped}</code>`;
            case 'codeblock':
                return `<pre class="p-2 my-1 rounded bg-secondary overflow-x-auto"><code>${escaped}</code></pre>`;
            case 'link':
                return `<a href="${escapeHtml(part.url || '')}" target="_blank" rel="noopener noreferrer" class="text-neon-cyan hover:underline">${escaped}</a>`;
            case 'emoji':
                if (part.url) {
                    // Custom Discord emoji
                    return `<img src="${part.url}" alt="${escaped}" class="inline-block w-5 h-5 align-middle" />`;
                }
                return escaped;
            case 'mention':
                return `<span class="px-1 rounded bg-neon-purple/30 text-neon-purple">${escaped}</span>`;
            case 'channel':
                return `<span class="px-1 rounded bg-neon-cyan/30 text-neon-cyan">${escaped}</span>`;
            default:
                return escaped;
        }
    }).join('');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Simple function to render Discord markdown to HTML
 */
export function renderDiscordMarkdown(text: string): string {
    const parts = parseDiscordMarkdown(text);
    return partsToHtml(parts);
}

export type { ParsedPart };


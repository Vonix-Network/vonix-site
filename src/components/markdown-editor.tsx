'use client';

// Dependencies: react-markdown, remark-gfm (Ensure these are installed)

import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import {
    Bold,
    Italic,
    Strikethrough,
    Link as LinkIcon,
    Image,
    List,
    ListOrdered,
    Quote,
    Code,
    Heading1,
    Heading2,
    Eye,
    Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    maxLength?: number;
    disabled?: boolean;
}

const toolbarButtons = [
    { icon: Bold, label: 'Bold', prefix: '**', suffix: '**' },
    { icon: Italic, label: 'Italic', prefix: '*', suffix: '*' },
    { icon: Strikethrough, label: 'Strikethrough', prefix: '~~', suffix: '~~' },
    { icon: Code, label: 'Code', prefix: '`', suffix: '`' },
    { icon: LinkIcon, label: 'Link', prefix: '[', suffix: '](url)' },
    { icon: Image, label: 'Image', prefix: '![alt](', suffix: ')' },
    { icon: Quote, label: 'Quote', prefix: '> ', suffix: '' },
    { icon: List, label: 'Bullet List', prefix: '- ', suffix: '' },
    { icon: ListOrdered, label: 'Numbered List', prefix: '1. ', suffix: '' },
    { icon: Heading1, label: 'Heading 1', prefix: '# ', suffix: '' },
    { icon: Heading2, label: 'Heading 2', prefix: '## ', suffix: '' },
];

export function MarkdownEditor({
    value,
    onChange,
    placeholder = 'Write your content here...',
    minHeight = '200px',
    maxLength = 10000,
    disabled = false,
}: MarkdownEditorProps) {
    const [mode, setMode] = useState<'write' | 'preview'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertFormat = useCallback(
        (prefix: string, suffix: string) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = value.substring(start, end);

            const newText =
                value.substring(0, start) +
                prefix +
                (selectedText || 'text') +
                suffix +
                value.substring(end);

            onChange(newText);

            // Restore cursor position
            setTimeout(() => {
                textarea.focus();
                const newCursorPos = start + prefix.length + (selectedText.length || 4);
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        },
        [value, onChange]
    );

    return (
        <div className="rounded-lg border border-white/10 overflow-hidden bg-secondary/30">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-0.5 flex-wrap">
                    {toolbarButtons.map((btn) => (
                        <button
                            key={btn.label}
                            type="button"
                            onClick={() => insertFormat(btn.prefix, btn.suffix)}
                            disabled={mode === 'preview' || disabled}
                            className={cn(
                                'p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors',
                                (mode === 'preview' || disabled) && 'opacity-50 cursor-not-allowed'
                            )}
                            title={btn.label}
                        >
                            <btn.icon className="w-4 h-4" />
                        </button>
                    ))}
                </div>

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => setMode('write')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium transition-all',
                            mode === 'write'
                                ? 'bg-neon-cyan/20 text-neon-cyan'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Write
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('preview')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium transition-all',
                            mode === 'preview'
                                ? 'bg-neon-purple/20 text-neon-purple'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                    </button>
                </div>
            </div>

            {/* Editor / Preview */}
            {mode === 'write' ? (
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        maxLength={maxLength}
                        className={cn(
                            'w-full p-4 bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground',
                            disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        style={{ minHeight }}
                    />
                </div>
            ) : (
                <div
                    className="p-4 prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-neon-cyan prose-code:bg-black/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-neon-cyan prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-neon-cyan prose-blockquote:text-muted-foreground"
                    style={{ minHeight }}
                >
                    {value ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                    ) : (
                        <p className="text-muted-foreground italic">Nothing to preview</p>
                    )}
                </div>
            )}

            {/* Character count */}
            {maxLength && (
                <div className="px-4 py-2 border-t border-white/5 text-xs text-muted-foreground text-right">
                    {value.length.toLocaleString()} / {maxLength.toLocaleString()} characters
                </div>
            )}
        </div>
    );
}

// Simple markdown renderer for displaying content
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
    return (
        <div
            className={cn(
                'prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-neon-cyan prose-code:bg-black/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-neon-cyan prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-neon-cyan prose-blockquote:text-muted-foreground',
                className
            )}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
    );
}

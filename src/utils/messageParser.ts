/**
 * Message parsing utilities for text commands, markdown-to-HTML conversion,
 * inline button parsing, and media command extraction.
 */

import type { InlineButtonRow, InlineButton, InlineButtonStyle } from '@/components/InlineButtonBuilder';

// ============ MARKDOWN → HTML ============

/** Convert common Markdown formatting to Telegram HTML */
export function markdownToHtml(text: string): string {
  let result = text;
  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  result = result.replace(/__(.+?)__/g, '<b>$1</b>');
  // Italic: *text* or _text_ (but not inside URLs or already-converted tags)
  result = result.replace(/(?<![<\w])_([^_\n]+?)_(?![>\w])/g, '<i>$1</i>');
  result = result.replace(/(?<![<\w])\*([^*\n]+?)\*(?![>\w])/g, '<i>$1</i>');
  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Inline code: `text`
  result = result.replace(/`([^`\n]+?)`/g, '<code>$1</code>');
  // Code block: ```text```
  result = result.replace(/```\n?([\s\S]*?)\n?```/g, '<pre>$1</pre>');
  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return result;
}

// ============ STYLE ICONS ============

const STYLE_ICON_MAP: Record<string, InlineButtonStyle> = {
  '🔵': 'primary',
  '🟢': 'success',
  '🔴': 'danger',
};

function parseStyleFromText(text: string): { style: InlineButtonStyle; cleanText: string } {
  for (const [icon, style] of Object.entries(STYLE_ICON_MAP)) {
    if (text.startsWith(icon)) {
      return { style, cleanText: text.slice(icon.length).trim() };
    }
  }
  return { style: 'default', cleanText: text.trim() };
}

// ============ INLINE BUTTON PARSING ============

interface ParsedButton {
  text: string;
  type: 'text' | 'link' | 'webapp';
  url?: string;
  callbackData?: string;
  style: InlineButtonStyle;
}

/** Parse a single button token like "text(url:https://...)" or "text(webapp:https://...)" or just "text" */
function parseSingleButton(token: string): ParsedButton {
  const trimmed = token.trim();
  const { style, cleanText } = parseStyleFromText(trimmed);
  
  // Check for (url:...) pattern
  const urlMatch = cleanText.match(/^(.+?)\s*\(url:(.+?)\)\s*$/);
  if (urlMatch) {
    return { text: urlMatch[1].trim(), type: 'link', url: urlMatch[2].trim(), style };
  }
  
  // Check for (webapp:...) pattern
  const webappMatch = cleanText.match(/^(.+?)\s*\(webapp:(.+?)\)\s*$/);
  if (webappMatch) {
    return { text: webappMatch[1].trim(), type: 'webapp', url: webappMatch[2].trim(), style };
  }
  
  // Plain text button
  return { text: cleanText, type: 'text', callbackData: cleanText.toLowerCase().replace(/\s+/g, '_'), style };
}

/** 
 * Parse ##INLINE:...## commands from text.
 * 
 * Rows separated by ], [ (comma between brackets)
 * Columns within a row separated by ;
 * 
 * Format with brackets (explicit rows):
 * ##INLINE:[btn1;btn2],[btn3;btn4]##
 * 
 * Format without brackets (each ; = new row):
 * ##INLINE:btn1;btn2;btn3##
 */
export function parseInlineCommands(text: string): { cleanText: string; buttons: InlineButtonRow[] } {
  const buttons: InlineButtonRow[] = [];
  
  const cleanText = text.replace(/##INLINE:([\s\S]*?)##/g, (_, content: string) => {
    const trimmedContent = content.trim();
    
    // Check if content uses bracket notation
    const hasBrackets = trimmedContent.includes('[');
    
    if (hasBrackets) {
      // Extract bracket groups: [btn1;btn2], [btn3;btn4]
      const bracketGroups = trimmedContent.match(/\[([^\]]*)\]/g);
      if (bracketGroups) {
        for (const group of bracketGroups) {
          const inner = group.slice(1, -1); // remove [ ]
          const tokens = inner.split(';').filter(t => t.trim());
          const rowButtons: InlineButton[] = tokens.map(t => {
            const parsed = parseSingleButton(t);
            return {
              id: crypto.randomUUID(),
              ...parsed,
            };
          });
          if (rowButtons.length > 0) {
            buttons.push({ id: crypto.randomUUID(), buttons: rowButtons });
          }
        }
      }
    } else {
      // No brackets: each semicolon-separated item is a new row
      const tokens = trimmedContent.split(';').filter(t => t.trim());
      for (const t of tokens) {
        const parsed = parseSingleButton(t);
        buttons.push({
          id: crypto.randomUUID(),
          buttons: [{
            id: crypto.randomUUID(),
            ...parsed,
          }],
        });
      }
    }
    
    return ''; // Remove the command from text
  });
  
  return { cleanText: cleanText.trim(), buttons };
}

// ============ MEDIA COMMAND PARSING ============

export interface ParsedMedia {
  type: 'photo' | 'video' | 'document' | 'video_note' | 'audio';
  source: string; // URL or file_id
}

export interface ParsedAlbum {
  sources: string[];
}

export interface ParsedMediaCommands {
  cleanText: string;
  media: ParsedMedia[];
  albums: ParsedAlbum[];
}

/** Parse ##IMG:url##, ##FILE:url##, ##VIDEO:url##, ##VIDEO_NOTE:url##, ##AUDIO:url##, ##ALBUM:url1;url2## */
export function parseMediaCommands(text: string): ParsedMediaCommands {
  const media: ParsedMedia[] = [];
  const albums: ParsedAlbum[] = [];
  
  let cleanText = text;
  
  // Single media
  const singlePatterns: Array<{ regex: RegExp; type: ParsedMedia['type'] }> = [
    { regex: /##IMG:(.+?)##/g, type: 'photo' },
    { regex: /##FILE:(.+?)##/g, type: 'document' },
    { regex: /##VIDEO:(.+?)##/g, type: 'video' },
    { regex: /##VIDEO_NOTE:(.+?)##/g, type: 'video_note' },
    { regex: /##AUDIO:(.+?)##/g, type: 'audio' },
  ];
  
  for (const { regex, type } of singlePatterns) {
    cleanText = cleanText.replace(regex, (_, source: string) => {
      media.push({ type, source: source.trim() });
      return '';
    });
  }
  
  // Albums
  cleanText = cleanText.replace(/##ALBUM:(.+?)##/g, (_, sources: string) => {
    const sourceList = sources.split(';').map(s => s.trim()).filter(Boolean);
    if (sourceList.length > 0) {
      albums.push({ sources: sourceList });
    }
    return '';
  });
  
  return { cleanText: cleanText.trim(), media, albums };
}

// ============ FULL MESSAGE PROCESSING ============

export interface ProcessedMessage {
  text: string;
  inlineButtons: InlineButtonRow[];
  media: ParsedMedia[];
  albums: ParsedAlbum[];
}

/** Process a message: convert markdown, extract inline commands and media commands */
export function processMessageText(text: string): ProcessedMessage {
  // 1. Convert markdown to HTML
  let processed = markdownToHtml(text);
  
  // 2. Extract inline button commands
  const { cleanText: afterInline, buttons } = parseInlineCommands(processed);
  processed = afterInline;
  
  // 3. Extract media commands
  const { cleanText: afterMedia, media, albums } = parseMediaCommands(processed);
  processed = afterMedia;
  
  return {
    text: processed,
    inlineButtons: buttons,
    media,
    albums,
  };
}

// ============ MESSAGE SPLITTING ============

/** Split text at sentence/paragraph boundaries respecting charLimit */
function splitAtBoundary(text: string, charLimit: number): string[] {
  const result: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charLimit) {
      result.push(remaining);
      break;
    }
    // Try paragraph break
    let splitIdx = remaining.lastIndexOf('\n\n', charLimit);
    if (splitIdx < charLimit * 0.3) splitIdx = remaining.lastIndexOf('\n', charLimit);
    // Try sentence break (. ! ?)
    if (splitIdx < charLimit * 0.3) {
      const sentenceMatch = remaining.slice(0, charLimit).match(/.*[.!?]\s/s);
      if (sentenceMatch) splitIdx = sentenceMatch[0].length;
    }
    if (splitIdx < charLimit * 0.3) splitIdx = remaining.lastIndexOf(' ', charLimit);
    if (splitIdx < charLimit * 0.3) splitIdx = charLimit;
    result.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  return result;
}

/** Split text by ✂️✂️✂️ or :: separators, then by char limit */
export function splitMessage(text: string, charLimit: number = 4000): string[] {
  const parts = text.split(/✂️✂️✂️|::/).map(p => p.trim()).filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    result.push(...splitAtBoundary(part, charLimit));
  }
  return result.length > 0 ? result : [text];
}

/** 
 * Process a full message into independently-parsed parts.
 * Each part from ✂️✂️✂️/:: split gets its own buttons, media, and text.
 */
export interface ProcessedMessagePart {
  text: string;
  inlineButtons: InlineButtonRow[];
  media: ParsedMedia[];
  albums: ParsedAlbum[];
}

export function processMessageIntoParts(rawText: string, defaultCharLimit: number = 4000): ProcessedMessagePart[] {
  // 1. First split by explicit separators (✂️✂️✂️ or ::)
  const explicitParts = rawText.split(/✂️✂️✂️|::/).map(p => p.trim()).filter(Boolean);
  if (explicitParts.length === 0) return [{ text: '', inlineButtons: [], media: [], albums: [] }];

  const result: ProcessedMessagePart[] = [];

  for (const part of explicitParts) {
    // 2. Convert markdown in this part
    const html = markdownToHtml(part);
    // 3. Extract inline buttons for THIS part
    const { cleanText: afterInline, buttons } = parseInlineCommands(html);
    // 4. Extract media commands for THIS part
    const { cleanText: afterMedia, media, albums } = parseMediaCommands(afterInline);

    // 5. Determine char limit: if this part has media, use 1000 for first chunk
    const hasPartMedia = media.length > 0 || albums.length > 0;
    const firstLimit = hasPartMedia ? 1000 : defaultCharLimit;

    // 6. Split the cleaned text if needed
    const textChunks = splitAtBoundary(afterMedia.trim(), firstLimit);
    
    if (textChunks.length <= 1) {
      // Single chunk — attach all buttons and media
      result.push({
        text: textChunks[0] || '',
        inlineButtons: buttons,
        media,
        albums,
      });
    } else {
      // Multiple chunks: media goes on first, buttons go on last
      for (let i = 0; i < textChunks.length; i++) {
        const isFirst = i === 0;
        const isLast = i === textChunks.length - 1;
        result.push({
          text: textChunks[i],
          inlineButtons: isLast ? buttons : [],
          media: isFirst ? media : [],
          albums: isFirst ? albums : [],
        });
        // After first chunk with media, use standard limit for rest
        // (splitAtBoundary already handled this with firstLimit for first split)
      }
    }
  }

  return result;
}

/** Resolve macros like {{field_key}} with client data */
export function resolveMacros(text: string, client: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === 'telegram_link') {
      const tgClient = client.telegram_client as string | null;
      const tgId = client.telegram_id as string | null;
      return tgClient
        ? `https://t.me/${(tgClient as string).replace('@', '')}`
        : tgId
          ? `tg://user?id=${tgId}`
          : '';
    }
    return client[key]?.toString() ?? '';
  });
}

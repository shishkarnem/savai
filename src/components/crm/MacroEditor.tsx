import React, { useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Bold,
  Italic,
  Code,
  Quote,
  Link,
  Terminal,
  Plus,
  Type,
  Image,
  Video,
  File,
  Trash2,
  Eye,
  Scissors,
} from 'lucide-react';
import type { MessageField, TextFormat, MediaType, MediaAttachment } from '@/pages/CRMMessageConstructor';
import { splitMessage, markdownToHtml, parseInlineCommands, parseMediaCommands, processMessageIntoParts, type ProcessedMessagePart } from '@/utils/messageParser';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

const CATEGORY_LABELS: Record<string, string> = {
  client: '👤 Клиент',
  project: '📂 Проект',
  finance: '💰 Финансы',
  expert: '🎓 Эксперт',
  dates: '📅 Даты',
  protalk: '🤖 ProTalk',
  documents: '📎 Документы',
  other: '📌 Другое',
};

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  photo: '🖼 Фото',
  video: '🎬 Видео',
  document: '📄 Документ',
  album: '🗂 Альбом',
};

interface MacroEditorProps {
  value: string;
  onChange: (value: string) => void;
  fields: MessageField[];
  media?: MediaAttachment[];
  onMediaChange?: (media: MediaAttachment[]) => void;
  useMediaCaption?: boolean;
  onUseMediaCaptionChange?: (v: boolean) => void;
  /** Show compact layout for chat sidebar */
  compact?: boolean;
  /** Client for preview with real data */
  previewClient?: Client | null;
}

/** Wraps `text` in the Telegram-HTML tag for `format`. */
function wrapWithFormat(text: string, format: TextFormat, linkText?: string): string {
  switch (format) {
    case 'bold':
      return `<b>${text}</b>`;
    case 'italic':
      return `<i>${text}</i>`;
    case 'code':
      return `<pre>${text}</pre>`;
    case 'mono':
      return `<code>${text}</code>`;
    case 'quote':
      return `<blockquote>${text}</blockquote>`;
    case 'link':
      return linkText ? `<a href="${text}">${linkText}</a>` : `<a href="${text}">${text}</a>`;
    default:
      return text;
  }
}

/** Resolve macros for preview */
function resolveMacrosForPreview(text: string, client: Client): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key === 'telegram_link') {
      return client.telegram_client
        ? `https://t.me/${client.telegram_client.replace('@', '')}`
        : client.telegram_id
          ? `tg://user?id=${client.telegram_id}`
          : match;
    }
    const val = (client as Record<string, unknown>)[key];
    return val?.toString() ?? match;
  });
}

const MacroEditor: React.FC<MacroEditorProps> = ({
  value,
  onChange,
  fields,
  media = [],
  onMediaChange,
  useMediaCaption = false,
  onUseMediaCaptionChange,
  compact = false,
  previewClient,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback(
    (insertion: string) => {
      const ta = textareaRef.current;
      if (!ta) {
        onChange(value + insertion);
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.slice(0, start) + insertion + value.slice(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.focus();
        const cursorPos = start + insertion.length;
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [value, onChange],
  );

  const wrapSelection = useCallback(
    (format: TextFormat) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end) || 'текст';
      const wrapped = wrapWithFormat(selected, format);
      const newVal = value.slice(0, start) + wrapped + value.slice(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start, start + wrapped.length);
      });
    },
    [value, onChange],
  );

  const insertFieldMacro = useCallback(
    (field: MessageField) => {
      const macro = `{{${field.key}}}`;
      let insertion: string;

      if (field.format === 'link') {
        const linkText = field.linkText || field.label;
        insertion = `<a href="${macro}">${linkText}</a>`;
      } else if (field.format === 'inline_button' || field.format === 'inline_button_link') {
        insertion = macro;
      } else if (field.format !== 'normal') {
        insertion = wrapWithFormat(macro, field.format);
      } else {
        insertion = macro;
      }

      insertAtCursor(insertion);
    },
    [insertAtCursor],
  );

  // Auto-convert markdown to HTML
  const handleConvertMarkdown = useCallback(() => {
    onChange(markdownToHtml(value));
  }, [value, onChange]);

  // Media helpers
  const addMedia = () => {
    if (!onMediaChange) return;
    onMediaChange([...media, { id: crypto.randomUUID(), type: 'photo', url: '' }]);
  };

  const updateMedia = (id: string, updates: Partial<MediaAttachment>) => {
    if (!onMediaChange) return;
    onMediaChange(media.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMedia = (id: string) => {
    if (!onMediaChange) return;
    onMediaChange(media.filter(m => m.id !== id));
  };

  const hasMedia = media.some(m => m.url.trim());
  const charLimit = hasMedia && useMediaCaption ? 1000 : 4000;
  const charCount = value.length;

  // Process into independent parts with per-part buttons/media
  const processedParts = useMemo(() => {
    if (!value.trim()) return [];
    return processMessageIntoParts(value);
  }, [value]);

  // Legacy split preview for char count
  const messageParts = useMemo(() => {
    if (!value.trim()) return [];
    return processedParts.map(p => p.text);
  }, [processedParts]);

  // Preview with real client data
  const previewWithData = useMemo(() => {
    if (!previewClient || !value.trim()) return null;
    return resolveMacrosForPreview(value, previewClient);
  }, [previewClient, value]);

  // Group fields by category
  const categories = ['client', 'project', 'finance', 'expert', 'dates', 'protalk', 'documents', 'other'] as const;
  const groupedFields = categories
    .map((cat) => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      fields: fields.filter((f) => f.category === cat),
    }))
    .filter((g) => g.fields.length > 0);

  const btnSize = compact ? 'h-6 px-1.5 text-[10px]' : 'h-7 px-2 text-xs';
  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div className="space-y-2 w-full min-w-0 overflow-x-hidden">
      <Label className={`${compact ? 'text-xs' : 'text-sm'} font-medium flex items-center gap-2`}>
        <Type className={iconSize} />
        Макро-редактор сообщения (HTML)
      </Label>

      {/* Format toolbar */}
      <div className="flex items-center gap-0.5 p-1 border border-border rounded-lg bg-muted/30 flex-wrap">
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5 font-bold`} onClick={() => wrapSelection('bold')} title="Жирный <b>">
          <Bold className={iconSize} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5 italic`} onClick={() => wrapSelection('italic')} title="Курсив <i>">
          <Italic className={iconSize} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5 font-mono`} onClick={() => wrapSelection('code')} title="Код <pre>">
          <Code className={iconSize} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5`} onClick={() => wrapSelection('mono')} title="Моноширинный <code>">
          <Terminal className={iconSize} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5`} onClick={() => wrapSelection('quote')} title="Цитата <blockquote>">
          <Quote className={iconSize} />
        </Button>

        <LinkInsertButton
          compact={compact}
          onInsert={(url, text) => {
            const ta = textareaRef.current;
            if (!ta) return;
            const insertion = `<a href="${url}">${text}</a>`;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const newVal = value.slice(0, start) + insertion + value.slice(end);
            onChange(newVal);
            requestAnimationFrame(() => ta.focus());
          }}
        />

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Markdown to HTML */}
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5`} onClick={handleConvertMarkdown} title="Конвертировать Markdown → HTML">
          <span className="text-[9px] font-mono">MD→HTML</span>
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className={`${btnSize} gap-0.5`}>
              <Plus className={iconSize} />
              Макрос
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-72 p-0" align="start">
            <ScrollArea className="h-[300px]">
              <div className="p-2 space-y-2">
                {groupedFields.map((group) => (
                  <div key={group.key}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-2 py-1">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.fields.map((field) => (
                        <button
                          key={field.key}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2"
                          onClick={() => insertFieldMacro(field)}
                        >
                          <span className="text-muted-foreground shrink-0">{field.icon}</span>
                          <span className="flex-1">{field.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {`{{${field.key}}}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Введите текст сообщения с макросами, например: {{full_name}}, {{tariff}}..."
        className={`${compact ? 'min-h-[100px]' : 'min-h-[200px]'} font-mono text-sm resize-y w-full max-w-full`}
      />

      {/* Char count */}
      <div className="flex flex-wrap items-start justify-between gap-1">
        <div className="text-[10px] text-muted-foreground">
          <b>Разделители:</b> ✂️✂️✂️ или :: — разбивают на отдельные сообщения
        </div>
        <span className={`text-[10px] ${charCount > charLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
          {charCount}/{charLimit}
          {charCount > charLimit && ` (будет разделено)`}
        </span>
      </div>

      {/* Split messages preview with per-part buttons/media */}
      {processedParts.length > 1 && (
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Scissors className={iconSize} />
            Сообщения будут разделены на {processedParts.length} частей:
          </Label>
          <div className="space-y-1">
            {processedParts.map((part, i) => (
              <div key={i} className="bg-muted/30 rounded p-2 text-xs border border-border space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Часть {i + 1}</span>
                  <span className="text-[10px] text-muted-foreground">{part.text.length} символов</span>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap break-words line-clamp-3">{part.text}</p>
                {/* Per-part media - visual previews */}
                {(part.media.length > 0 || part.albums.length > 0) && (
                  <div className="mt-1 space-y-1">
                    <div className="grid grid-cols-3 gap-1">
                      {part.media.map((m, j) => (
                        <MediaPreviewThumb key={j} media={{ type: m.type, url: m.source }} />
                      ))}
                      {part.albums.flatMap((a, ai) => a.sources.map((src, si) => (
                        <MediaPreviewThumb key={`a-${ai}-${si}`} media={{ type: 'photo', url: src }} />
                      )))}
                    </div>
                  </div>
                )}
                {/* Per-part buttons */}
                {part.inlineButtons.length > 0 && (
                  <div className="bg-[#1a1a1a] rounded p-1.5 space-y-0.5 mt-1">
                    {part.inlineButtons.map((row, ri) => (
                      <div key={ri} className="flex gap-1 flex-wrap">
                        {row.buttons.map((btn, bi) => (
                          <div key={bi} className="flex-1 min-w-[80px] text-center py-0.5 px-1 rounded bg-[#3390ec]/20 border border-[#3390ec]/40 text-[9px] text-[#3390ec] truncate">
                            {btn.type === 'link' && '🔗 '}{btn.type === 'webapp' && '🌐 '}{btn.text}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single message: show buttons/media from text commands */}
      {processedParts.length === 1 && processedParts[0]?.inlineButtons.length > 0 && (
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Кнопки из текстовых команд:</Label>
          <div className="bg-[#1a1a1a] rounded-lg p-2 space-y-1 overflow-x-hidden">
            {processedParts[0].inlineButtons.map((row, i) => (
              <div key={i} className="flex gap-1 flex-wrap">
                {row.buttons.map((btn, j) => (
                  <div key={j} className="flex-1 min-w-[80px] text-center py-1 px-1 rounded bg-[#3390ec]/20 border border-[#3390ec]/40 text-[10px] text-[#3390ec] truncate">
                    {btn.type === 'link' && '🔗 '}{btn.type === 'webapp' && '🌐 '}{btn.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {processedParts.length === 1 && (processedParts[0]?.media.length > 0 || processedParts[0]?.albums.length > 0) && (
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Медиа из текстовых команд:</Label>
          <div className="grid grid-cols-3 gap-1">
            {processedParts[0].media.map((m, i) => (
              <MediaPreviewThumb key={i} media={{ type: m.type, url: m.source }} />
            ))}
            {processedParts[0].albums.flatMap((a, ai) => a.sources.map((src, si) => (
              <MediaPreviewThumb key={`album-${ai}-${si}`} media={{ type: 'photo', url: src }} />
            )))}
          </div>
        </div>
      )}
      {/* Preview with real data */}
      {previewClient && previewWithData && (
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Eye className={iconSize} />
            Предпросмотр для: {previewClient.full_name || previewClient.telegram_client || 'Клиент'}
          </Label>
          <div className="bg-[#1a1a1a] rounded-lg p-3 text-xs text-white/80 whitespace-pre-wrap">
            {previewWithData}
          </div>
        </div>
      )}

      {/* Media section */}
      {onMediaChange && (
        <div className="space-y-2 border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <Label className={`${compact ? 'text-[10px]' : 'text-xs'} flex items-center gap-1`}>
              <Image className={iconSize} />
              Медиафайлы
            </Label>
            <Button variant="ghost" size="sm" onClick={addMedia} className={`${btnSize} gap-0.5`}>
              <Plus className={iconSize} />
              Добавить
            </Button>
          </div>

          {media.length > 0 && onUseMediaCaptionChange && (
            <div className="flex items-center gap-2">
              <Switch
                checked={useMediaCaption}
                onCheckedChange={onUseMediaCaptionChange}
                id="macroMediaCaption"
                className="scale-75"
              />
              <Label htmlFor="macroMediaCaption" className="text-[10px]">
                Текст как подпись к медиа (лимит 1000 символов)
              </Label>
            </div>
          )}

          {media.map((m) => (
            <div key={m.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
              <Select value={m.type} onValueChange={(v: MediaType) => updateMedia(m.id, { type: v })}>
                <SelectTrigger className="w-full sm:w-20 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEDIA_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={m.url}
                onChange={(e) => updateMedia(m.id, { url: e.target.value })}
                placeholder="URL или file_id"
                className="flex-1 min-w-0 h-7 text-[10px]"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 self-end sm:self-auto" onClick={() => removeMedia(m.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}

      {/* Media preview - visual */}
          {hasMedia && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>
                  {media.filter(m => m.url.trim()).length === 1
                    ? MEDIA_TYPE_LABELS[media[0].type]
                    : `Альбом (${media.filter(m => m.url.trim()).length} файлов)`}
                </span>
                {useMediaCaption && <span className="text-primary">+ подпись</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {media.filter(m => m.url.trim()).map((m) => (
                  <MediaPreviewThumb key={m.id} media={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground space-y-0.5 break-words [&_code]:break-all">
        <p>
          <b>Формат:</b> только HTML. {'<b>жирный</b>'}, {'<i>курсив</i>'}, {'<pre>код</pre>'},{' '}
          {'<code>моно</code>'}, {'<blockquote>цитата</blockquote>'},{' '}
          {'<a href="url">текст</a>'}, {'<s>зачёркнутый</s>'}
        </p>
        <p>
          <b>Макросы:</b> {`{{field_key}}`} — подставляются при отправке.
        </p>
        <p>
          <b>Медиа в тексте:</b> {'##IMG:url##'}, {'##VIDEO:url##'}, {'##FILE:url##'}, {'##VIDEO_NOTE:id##'}, {'##AUDIO:url##'}, {'##ALBUM:url1;url2##'}
        </p>
        <p>
          <b>Кнопки в тексте:</b> {'##INLINE:[🔵кнопка;🔴кнопка2],[кнопка3(url:https://...)]##'}
        </p>
        <p>
          <b>MD→HTML:</b> нажмите кнопку для конвертации markdown в HTML
        </p>
      </div>
    </div>
  );
};

/** Thumbnail preview for a media attachment */
function MediaPreviewThumb({ media }: { media: { type: string; url: string } }) {
  const [error, setError] = React.useState(false);
  const url = media.url.trim();
  const isUrl = url.startsWith('http://') || url.startsWith('https://');

  if (!isUrl || error) {
    return (
      <div className="aspect-square rounded border border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground gap-1">
        {media.type === 'video' ? <Video className="w-5 h-5" /> : media.type === 'document' ? <File className="w-5 h-5" /> : <Image className="w-5 h-5" />}
        <span className="text-[8px] truncate max-w-full px-1">{url.length > 20 ? url.slice(0, 20) + '...' : url}</span>
      </div>
    );
  }

  if (media.type === 'video') {
    return (
      <div className="aspect-square rounded border border-border bg-black overflow-hidden relative">
        <video src={url} className="w-full h-full object-cover" muted preload="metadata" onError={() => setError(true)} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Video className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-square rounded border border-border overflow-hidden bg-muted/30">
      <img src={url} alt="" className="w-full h-full object-cover" onError={() => setError(true)} loading="lazy" />
    </div>
  );
}

function LinkInsertButton({ onInsert, compact = false }: { onInsert: (url: string, text: string) => void; compact?: boolean }) {
  const [url, setUrl] = React.useState('');
  const [text, setText] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const handleInsert = () => {
    if (url.trim()) {
      onInsert(url.trim(), text.trim() || url.trim());
      setUrl('');
      setText('');
      setOpen(false);
    }
  };

  const btnSize = compact ? 'h-6 px-1.5 text-[10px]' : 'h-7 px-2 text-xs';
  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5`} title="Ссылка <a href>">
          <Link className={iconSize} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] max-w-64 space-y-2" align="start">
        <Label className="text-xs">Текст ссылки</Label>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Написать нам" className="h-7 text-xs" />
        <Label className="text-xs">URL или макрос</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://t.me/... или {{telegram_link}}" className="h-7 text-xs" />
        <Button size="sm" className="w-full h-7 text-xs" onClick={handleInsert}>Вставить ссылку</Button>
      </PopoverContent>
    </Popover>
  );
}

export default MacroEditor;

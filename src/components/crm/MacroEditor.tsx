import React, { useRef, useCallback } from 'react';
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
} from 'lucide-react';
import type { MessageField, TextFormat, MediaType, MediaAttachment } from '@/pages/CRMMessageConstructor';

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
}

/** Wraps `text` in the Telegram-HTML tag for `format`. */
function wrapWithFormat(text: string, format: TextFormat, linkText?: string): string {
  switch (format) {
    case 'bold':
      return `<b>${text}</b>`;
    case 'italic':
      return `<i>${text}</i>`;
    case 'code':
      return `\`\`\`\n${text}\n\`\`\``;
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

const MacroEditor: React.FC<MacroEditorProps> = ({
  value,
  onChange,
  fields,
  media = [],
  onMediaChange,
  useMediaCaption = false,
  onUseMediaCaptionChange,
  compact = false,
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
    <div className="space-y-2">
      <Label className={`${compact ? 'text-xs' : 'text-sm'} font-medium flex items-center gap-2`}>
        <Type className={iconSize} />
        Макро-редактор сообщения
      </Label>

      {/* Format toolbar */}
      <div className="flex items-center gap-0.5 p-1 border border-border rounded-lg bg-muted/30 flex-wrap">
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5 font-bold`} onClick={() => wrapSelection('bold')} title="Жирный <b>">
          <Bold className={iconSize} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5 italic`} onClick={() => wrapSelection('italic')} title="Курсив <i>">
          <Italic className={iconSize} />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} gap-0.5 font-mono`} onClick={() => wrapSelection('code')} title="Код ```">
          <Code className={iconSize} />
          <span>```</span>
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

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className={`${btnSize} gap-0.5`}>
              <Plus className={iconSize} />
              Макрос
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
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
        className={`${compact ? 'min-h-[100px]' : 'min-h-[200px]'} font-mono text-sm resize-y`}
      />

      {/* Char count */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-muted-foreground">
          <b>Разделители:</b> ✂️✂️✂️ или :: — разбивают на отдельные сообщения
        </div>
        <span className={`text-[10px] ${charCount > charLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
          {charCount}/{charLimit}
          {charCount > charLimit && ` (будет разделено)`}
        </span>
      </div>

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
            <div key={m.id} className="flex items-center gap-1.5">
              <Select value={m.type} onValueChange={(v: MediaType) => updateMedia(m.id, { type: v })}>
                <SelectTrigger className="w-20 h-7 text-[10px]">
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
                className="flex-1 h-7 text-[10px]"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeMedia(m.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}

          {/* Media preview */}
          {hasMedia && (
            <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded text-[10px] text-muted-foreground">
              {media[0].type === 'photo' && <Image className="w-3 h-3" />}
              {media[0].type === 'video' && <Video className="w-3 h-3" />}
              {media[0].type === 'document' && <File className="w-3 h-3" />}
              {media[0].type === 'album' && <Image className="w-3 h-3" />}
              <span>
                {media.filter(m => m.url.trim()).length === 1
                  ? MEDIA_TYPE_LABELS[media[0].type]
                  : `Альбом (${media.filter(m => m.url.trim()).length} файлов)`}
              </span>
              {useMediaCaption && <span className="text-primary">+ подпись</span>}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>
          <b>Макросы:</b> {`{{field_key}}`} — подставляются при отправке.
        </p>
        <p>
          <b>Форматы:</b> {'<b>жирный</b>'}, {'<i>курсив</i>'}, {'```код```'},{' '}
          {'<code>моно</code>'}, {'<blockquote>цитата</blockquote>'},{' '}
          {'<a href="url">текст ссылки</a>'}
        </p>
      </div>
    </div>
  );
};

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
      <PopoverContent className="w-64 space-y-2" align="start">
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

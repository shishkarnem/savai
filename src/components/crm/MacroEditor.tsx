import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Bold,
  Italic,
  Code,
  Quote,
  Link,
  Terminal,
  Plus,
  Type,
} from 'lucide-react';
import type { MessageField, TextFormat } from '@/pages/CRMMessageConstructor';

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

interface MacroEditorProps {
  value: string;
  onChange: (value: string) => void;
  fields: MessageField[];
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

const MacroEditor: React.FC<MacroEditorProps> = ({ value, onChange, fields }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Insert text at cursor position in the textarea. */
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
      // Restore cursor after insertion
      requestAnimationFrame(() => {
        ta.focus();
        const cursorPos = start + insertion.length;
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [value, onChange],
  );

  /** Wrap the current selection with a formatting tag. */
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

  /** Insert a field macro like {{field_key}} with formatting applied. */
  const insertFieldMacro = useCallback(
    (field: MessageField) => {
      const macro = `{{${field.key}}}`;
      let insertion: string;

      if (field.format === 'link') {
        const linkText = field.linkText || field.label;
        insertion = `<a href="${macro}">${linkText}</a>`;
      } else if (field.format === 'inline_button' || field.format === 'inline_button_link') {
        insertion = macro; // buttons are handled separately
      } else if (field.format !== 'normal') {
        insertion = wrapWithFormat(macro, field.format);
      } else {
        insertion = macro;
      }

      insertAtCursor(insertion);
    },
    [insertAtCursor],
  );

  // Group fields by category
  const categories = ['client', 'project', 'finance', 'expert', 'dates', 'protalk', 'documents', 'other'] as const;
  const groupedFields = categories
    .map((cat) => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      fields: fields.filter((f) => f.category === cat),
    }))
    .filter((g) => g.fields.length > 0);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Type className="w-4 h-4" />
        Макро-редактор сообщения
      </Label>

      {/* Format toolbar */}
      <div className="flex items-center gap-1 p-1 border border-border rounded-lg bg-muted/30 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 font-bold"
          onClick={() => wrapSelection('bold')}
          title="Жирный <b>"
        >
          <Bold className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 italic"
          onClick={() => wrapSelection('italic')}
          title="Курсив <i>"
        >
          <Italic className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 font-mono"
          onClick={() => wrapSelection('code')}
          title="Код ``` (тройные обратные кавычки)"
        >
          <Code className="w-3.5 h-3.5" />
          <span>```</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => wrapSelection('mono')}
          title="Моноширинный <code>"
        >
          <Terminal className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => wrapSelection('quote')}
          title="Цитата <blockquote>"
        >
          <Quote className="w-3.5 h-3.5" />
        </Button>

        {/* Link insertion with popover for link text */}
        <LinkInsertButton
          onInsert={(url, text) => {
            const ta = textareaRef.current;
            if (!ta) return;
            const insertion = `<a href="${url}">${text}</a>`;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const newVal = value.slice(0, start) + insertion + value.slice(end);
            onChange(newVal);
            requestAnimationFrame(() => {
              ta.focus();
            });
          }}
        />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Macro insertion dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
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

      {/* Editable textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Введите текст сообщения с макросами, например: {{full_name}}, {{tariff}}..."
        className="min-h-[200px] font-mono text-sm resize-y"
      />

      <div className="text-[10px] text-muted-foreground space-y-1">
        <p>
          <b>Макросы:</b> {`{{field_key}}`} — подставляются автоматически при отправке.
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

/** Small popover button for inserting links with custom text. */
function LinkInsertButton({ onInsert }: { onInsert: (url: string, text: string) => void }) {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          title="Ссылка <a href>"
        >
          <Link className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2" align="start">
        <Label className="text-xs">Текст ссылки</Label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать нам"
          className="h-7 text-xs"
        />
        <Label className="text-xs">URL или макрос</Label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://t.me/... или {{telegram_link}}"
          className="h-7 text-xs"
        />
        <Button size="sm" className="w-full h-7 text-xs" onClick={handleInsert}>
          Вставить ссылку
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export default MacroEditor;

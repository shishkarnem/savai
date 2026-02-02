import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  MessageSquare,
  User,
  Briefcase,
  DollarSign,
  Calendar,
  Bot,
  Send,
  Eye,
  FileText,
  MapPin,
  Settings,
  Link,
  Hash,
  Image,
  Video,
  File,
  Plus,
  Trash2
} from 'lucide-react';

// Text formatting types
export type TextFormat = 'normal' | 'bold' | 'italic' | 'code' | 'mono' | 'quote' | 'link' | 'inline_button' | 'inline_button_link';

export const FORMAT_LABELS: Record<TextFormat, string> = {
  normal: 'Обычный',
  bold: 'Жирный',
  italic: 'Курсив',
  code: 'Код',
  mono: 'Моноширинный',
  quote: 'Цитата',
  link: 'Ссылка',
  inline_button: 'Кнопка',
  inline_button_link: 'Кнопка-ссылка',
};

// Media types
export type MediaType = 'photo' | 'video' | 'document' | 'album';

export interface MediaAttachment {
  id: string;
  type: MediaType;
  url: string; // URL or file_id
  caption?: string;
}

// Define message fields that can be toggled
export interface MessageField {
  key: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  format: TextFormat;
  category: 'client' | 'project' | 'finance' | 'expert' | 'dates' | 'protalk' | 'documents' | 'other';
  customLabel?: string;
  buttonText?: string;
}

// All CRM fields from database
const ALL_CRM_FIELDS: MessageField[] = [
  // Client info
  { key: 'full_name', label: 'ФИО клиента', icon: <User className="w-4 h-4" />, enabled: true, format: 'bold', category: 'client' },
  { key: 'telegram_link', label: 'Ссылка на Telegram', icon: <Send className="w-4 h-4" />, enabled: true, format: 'link', category: 'client' },
  { key: 'telegram_id', label: 'Telegram ID', icon: <Hash className="w-4 h-4" />, enabled: true, format: 'code', category: 'client' },
  { key: 'telegram_client', label: 'Telegram клиента', icon: <User className="w-4 h-4" />, enabled: false, format: 'normal', category: 'client' },
  { key: 'city', label: 'Город', icon: <MapPin className="w-4 h-4" />, enabled: true, format: 'normal', category: 'client' },
  { key: 'channel', label: 'Канал', icon: <Send className="w-4 h-4" />, enabled: false, format: 'normal', category: 'client' },
  { key: 'status', label: 'Статус', icon: <Settings className="w-4 h-4" />, enabled: false, format: 'bold', category: 'client' },
  { key: 'comment', label: 'Комментарий', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'italic', category: 'client' },
  { key: 'send_status', label: 'Статус отправки', icon: <Send className="w-4 h-4" />, enabled: false, format: 'normal', category: 'client' },
  { key: 'reminder_time', label: 'Время напоминания', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'client' },
  { key: 'reminder_text', label: 'Текст напоминания', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'italic', category: 'client' },
  { key: 'last_message', label: 'Последнее сообщение', icon: <MessageSquare className="w-4 h-4" />, enabled: false, format: 'quote', category: 'client' },
  { key: 'last_100_messages', label: 'История сообщений (100)', icon: <MessageSquare className="w-4 h-4" />, enabled: false, format: 'code', category: 'client' },
  
  // Project info
  { key: 'project', label: 'Проект', icon: <Briefcase className="w-4 h-4" />, enabled: true, format: 'bold', category: 'project' },
  { key: 'project_code', label: 'Код проекта', icon: <Hash className="w-4 h-4" />, enabled: false, format: 'code', category: 'project' },
  { key: 'product', label: 'Продукт', icon: <Briefcase className="w-4 h-4" />, enabled: true, format: 'normal', category: 'project' },
  { key: 'department', label: 'Отдел', icon: <Briefcase className="w-4 h-4" />, enabled: false, format: 'normal', category: 'project' },
  { key: 'department_text', label: 'Описание отдела', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'italic', category: 'project' },
  { key: 'employees_count', label: 'Количество сотрудников', icon: <User className="w-4 h-4" />, enabled: false, format: 'bold', category: 'project' },
  { key: 'functionality', label: 'Функционал', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'quote', category: 'project' },
  { key: 'service', label: 'Услуга', icon: <Briefcase className="w-4 h-4" />, enabled: false, format: 'normal', category: 'project' },
  { key: 'service_type', label: 'Тип услуги', icon: <Settings className="w-4 h-4" />, enabled: false, format: 'normal', category: 'project' },
  { key: 'kp_text', label: 'Текст КП', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'quote', category: 'project' },
  { key: 'software_text', label: 'Текст ПО', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'code', category: 'project' },
  
  // Finance
  { key: 'sav_cost', label: 'Стоимость SAV', icon: <DollarSign className="w-4 h-4" />, enabled: true, format: 'bold', category: 'finance' },
  { key: 'tariff', label: 'Тариф', icon: <DollarSign className="w-4 h-4" />, enabled: true, format: 'bold', category: 'finance' },
  { key: 'avg_salary', label: 'Средняя ЗП', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'region_salary', label: 'Региональная ЗП', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'real_salary', label: 'Реальная ЗП', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'ai_employee_cost', label: 'Стоимость ИИ-сотрудника', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'bold', category: 'finance' },
  { key: 'ai_tokens_price', label: 'Стоимость токенов ИИ', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'service_price', label: 'Стоимость услуги', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'bold', category: 'finance' },
  { key: 'software_price', label: 'Стоимость ПО', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'payback', label: 'Окупаемость', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'bold', category: 'finance' },
  { key: 'refund_amount', label: 'Сумма возврата', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  
  // Expert
  { key: 'selected_expert', label: 'Выбранный эксперт', icon: <Bot className="w-4 h-4" />, enabled: true, format: 'bold', category: 'expert' },
  { key: 'expert_name', label: 'Имя эксперта', icon: <User className="w-4 h-4" />, enabled: false, format: 'normal', category: 'expert' },
  { key: 'expert_pseudonym', label: 'Псевдоним эксперта', icon: <User className="w-4 h-4" />, enabled: false, format: 'italic', category: 'expert' },
  
  // Dates
  { key: 'calculator_date', label: 'Дата калькулятора', icon: <Calendar className="w-4 h-4" />, enabled: true, format: 'normal', category: 'dates' },
  { key: 'start_date', label: 'Дата старта', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'tariff_date', label: 'Дата тарифа', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'expert_date', label: 'Дата эксперта', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'payment_date', label: 'Дата оплаты', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'bold', category: 'dates' },
  { key: 'service_start_date', label: 'Дата начала услуги', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'work_start_date', label: 'Дата начала работ', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'work_end_date', label: 'Дата окончания работ', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'act_date', label: 'Дата акта', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'rejection_date', label: 'Дата отказа', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'block_date', label: 'Дата блокировки', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  
  // ProTalk
  { key: 'protalk_name', label: 'Имя ProTalk', icon: <Bot className="w-4 h-4" />, enabled: false, format: 'normal', category: 'protalk' },
  { key: 'protalk_id', label: 'ID ProTalk', icon: <Hash className="w-4 h-4" />, enabled: false, format: 'code', category: 'protalk' },
  { key: 'protalk_send_status', label: 'Статус отправки ProTalk', icon: <Send className="w-4 h-4" />, enabled: false, format: 'normal', category: 'protalk' },
  { key: 'bot_token', label: 'Токен бота', icon: <Bot className="w-4 h-4" />, enabled: false, format: 'code', category: 'protalk' },
  { key: 'script_id', label: 'ID скрипта', icon: <Hash className="w-4 h-4" />, enabled: false, format: 'code', category: 'protalk' },
  
  // Documents
  { key: 'contract_ooo_url', label: 'Договор ООО', icon: <Link className="w-4 h-4" />, enabled: false, format: 'inline_button_link', category: 'documents', buttonText: '📄 Договор ООО' },
  { key: 'contract_ip_url', label: 'Договор ИП', icon: <Link className="w-4 h-4" />, enabled: false, format: 'inline_button_link', category: 'documents', buttonText: '📄 Договор ИП' },
  { key: 'project_plan_url', label: 'План проекта', icon: <Link className="w-4 h-4" />, enabled: false, format: 'inline_button_link', category: 'documents', buttonText: '📋 План проекта' },
];

const CATEGORY_LABELS: Record<string, string> = {
  client: '👤 Информация о клиенте',
  project: '📂 Информация о проекте',
  finance: '💰 Финансы',
  expert: '🎓 Эксперт',
  dates: '📅 Даты',
  protalk: '🤖 ProTalk',
  documents: '📎 Документы',
  other: '📌 Другое',
};

export const MESSAGE_CONSTRUCTOR_STORAGE_KEY = 'sav-crm-message-constructor';
export const CHAT_CONSTRUCTOR_STORAGE_KEY = 'sav-crm-chat-constructor';

export interface MessageConstructorSettings {
  fields: MessageField[];
  headerText: string;
  footerText: string;
  media: MediaAttachment[];
  useMediaCaption: boolean;
}

// Export for use in other components
export function getMessageConstructorSettings(): MessageConstructorSettings {
  const saved = localStorage.getItem(MESSAGE_CONSTRUCTOR_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge saved fields with defaults
      const mergedFields = ALL_CRM_FIELDS.map(defaultField => {
        const savedField = parsed.fields?.find((f: MessageField) => f.key === defaultField.key);
        return savedField ? { ...defaultField, enabled: savedField.enabled, format: savedField.format || defaultField.format, customLabel: savedField.customLabel, buttonText: savedField.buttonText } : defaultField;
      });
      return {
        fields: mergedFields,
        headerText: parsed.headerText || '🔔 Новый выбор эксперта!',
        footerText: parsed.footerText || '',
        media: parsed.media || [],
        useMediaCaption: parsed.useMediaCaption || false,
      };
    } catch (e) {
      console.error('Failed to parse message settings:', e);
    }
  }
  return {
    fields: ALL_CRM_FIELDS,
    headerText: '🔔 Новый выбор эксперта!',
    footerText: '',
    media: [],
    useMediaCaption: false,
  };
}

export function getChatConstructorSettings(): MessageConstructorSettings {
  const saved = localStorage.getItem(CHAT_CONSTRUCTOR_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const mergedFields = ALL_CRM_FIELDS.map(defaultField => {
        const savedField = parsed.fields?.find((f: MessageField) => f.key === defaultField.key);
        return savedField ? { ...defaultField, enabled: savedField.enabled, format: savedField.format || defaultField.format, customLabel: savedField.customLabel, buttonText: savedField.buttonText } : defaultField;
      });
      return {
        fields: mergedFields,
        headerText: parsed.headerText || '',
        footerText: parsed.footerText || '',
        media: parsed.media || [],
        useMediaCaption: parsed.useMediaCaption || false,
      };
    } catch (e) {
      console.error('Failed to parse chat settings:', e);
    }
  }
  return {
    fields: ALL_CRM_FIELDS.map(f => ({ ...f, enabled: false })),
    headerText: '',
    footerText: '',
    media: [],
    useMediaCaption: false,
  };
}

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  photo: '🖼 Фото',
  video: '🎬 Видео',
  document: '📄 Документ',
  album: '🗂 Альбом',
};

interface MessageConstructorFormProps {
  storageKey: string;
  title: string;
  description: string;
  defaultHeaderText?: string;
}

export function MessageConstructorForm({ 
  storageKey, 
  title, 
  description,
  defaultHeaderText = ''
}: MessageConstructorFormProps) {
  const { toast } = useToast();
  
  const [fields, setFields] = useState<MessageField[]>(ALL_CRM_FIELDS);
  const [headerText, setHeaderText] = useState(defaultHeaderText);
  const [footerText, setFooterText] = useState('');
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [useMediaCaption, setUseMediaCaption] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mergedFields = ALL_CRM_FIELDS.map(defaultField => {
          const savedField = parsed.fields?.find((f: MessageField) => f.key === defaultField.key);
          return savedField ? { ...defaultField, enabled: savedField.enabled, format: savedField.format || defaultField.format, customLabel: savedField.customLabel, buttonText: savedField.buttonText } : defaultField;
        });
        setFields(mergedFields);
        setHeaderText(parsed.headerText || defaultHeaderText);
        setFooterText(parsed.footerText || '');
        setMedia(parsed.media || []);
        setUseMediaCaption(parsed.useMediaCaption || false);
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, [storageKey, defaultHeaderText]);

  const toggleField = (key: string) => {
    setFields(prev => prev.map(f => 
      f.key === key ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const updateFieldFormat = (key: string, format: TextFormat) => {
    setFields(prev => prev.map(f => 
      f.key === key ? { ...f, format } : f
    ));
  };

  const updateFieldButtonText = (key: string, buttonText: string) => {
    setFields(prev => prev.map(f => 
      f.key === key ? { ...f, buttonText } : f
    ));
  };

  const addMedia = () => {
    setMedia(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'photo',
      url: '',
    }]);
  };

  const updateMedia = (id: string, updates: Partial<MediaAttachment>) => {
    setMedia(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  const removeMedia = (id: string) => {
    setMedia(prev => prev.filter(m => m.id !== id));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        fields,
        headerText,
        footerText,
        media,
        useMediaCaption,
      }));
      toast({
        title: 'Настройки сохранены',
        description: 'Конфигурация сообщения обновлена',
      });
    } catch (e) {
      toast({
        title: 'Ошибка сохранения',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFields(ALL_CRM_FIELDS);
    setHeaderText(defaultHeaderText);
    setFooterText('');
    setMedia([]);
    setUseMediaCaption(false);
    localStorage.removeItem(storageKey);
    toast({
      title: 'Настройки сброшены',
    });
  };

  // Format value for preview
  const formatValue = (format: TextFormat, value: string, buttonText?: string): string => {
    switch (format) {
      case 'bold': return `<b>${value}</b>`;
      case 'italic': return `<i>${value}</i>`;
      case 'code': return `<code>${value}</code>`;
      case 'mono': return `<pre>${value}</pre>`;
      case 'quote': return `<blockquote>${value}</blockquote>`;
      case 'link': return `<a href="${value}">${value}</a>`;
      case 'inline_button': return `[${buttonText || value}]`;
      case 'inline_button_link': return `[${buttonText || value}](${value})`;
      default: return value;
    }
  };

  // Generate preview message
  const generatePreview = () => {
    const enabledFields = fields.filter(f => f.enabled);
    const lines: string[] = [];
    
    if (headerText) {
      lines.push(headerText);
      lines.push('');
    }
    
    // Group by category
    const categories = ['client', 'project', 'finance', 'expert', 'dates', 'protalk', 'documents', 'other'];
    for (const category of categories) {
      const categoryFields = enabledFields.filter(f => f.category === category);
      if (categoryFields.length > 0) {
        lines.push(`${CATEGORY_LABELS[category]}:`);
        for (const field of categoryFields) {
          const sampleValue = field.key === 'telegram_link' ? 't.me/username' 
            : field.key === 'last_100_messages' ? '[История 100 сообщений...]'
            : '[значение]';
          const formattedValue = formatValue(field.format, sampleValue, field.buttonText);
          lines.push(`  • ${field.label}: ${formattedValue}`);
        }
        lines.push('');
      }
    }
    
    if (footerText) {
      lines.push(footerText);
    }
    
    return lines.join('\n');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Сбросить
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Header text */}
          <div className="space-y-2">
            <Label htmlFor="header">Заголовок сообщения</Label>
            <Input
              id="header"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Заголовок..."
            />
          </div>

          {/* Media attachments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Медиафайлы</Label>
              <Button variant="outline" size="sm" onClick={addMedia} className="gap-1">
                <Plus className="w-3 h-3" />
                Добавить
              </Button>
            </div>
            
            {media.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <Switch
                  checked={useMediaCaption}
                  onCheckedChange={setUseMediaCaption}
                  id="useCaption"
                />
                <Label htmlFor="useCaption" className="text-sm">
                  Использовать текст как подпись к медиа
                </Label>
              </div>
            )}
            
            <div className="space-y-2">
              {media.map((m) => (
                <div key={m.id} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border">
                  <Select
                    value={m.type}
                    onValueChange={(value: MediaType) => updateMedia(m.id, { type: value })}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEDIA_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={m.url}
                    onChange={(e) => updateMedia(m.id, { url: e.target.value })}
                    placeholder="URL или file_id"
                    className="flex-1 h-8 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeMedia(m.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            
            {media.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Добавьте фото, видео или документы по URL или file_id
              </p>
            )}
          </div>

          <Separator />

          {/* Fields by category */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {(['client', 'project', 'finance', 'expert', 'dates', 'protalk', 'documents'] as const).map(category => {
                const categoryFields = fields.filter(f => f.category === category);
                if (categoryFields.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {CATEGORY_LABELS[category]} ({categoryFields.filter(f => f.enabled).length}/{categoryFields.length})
                    </h4>
                    <div className="space-y-2">
                      {categoryFields.map(field => (
                        <div
                          key={field.key}
                          className={`p-3 rounded-lg border transition-colors ${
                            field.enabled 
                              ? 'bg-primary/5 border-primary/30' 
                              : 'bg-muted/30 border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">{field.icon}</span>
                              <span className="text-sm font-medium">{field.label}</span>
                            </div>
                            <Switch
                              checked={field.enabled}
                              onCheckedChange={() => toggleField(field.key)}
                            />
                          </div>
                          
                          {field.enabled && (
                            <div className="ml-7 mt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground w-16">Формат:</Label>
                                <Select
                                  value={field.format}
                                  onValueChange={(value: TextFormat) => updateFieldFormat(field.key, value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(FORMAT_LABELS).map(([key, label]) => (
                                      <SelectItem key={key} value={key} className="text-xs">
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {(field.format === 'inline_button' || field.format === 'inline_button_link') && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground w-16">Текст:</Label>
                                  <Input
                                    value={field.buttonText || ''}
                                    onChange={(e) => updateFieldButtonText(field.key, e.target.value)}
                                    placeholder="Текст кнопки"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <Separator />

          {/* Footer text */}
          <div className="space-y-2">
            <Label htmlFor="footer">Подпись сообщения (опционально)</Label>
            <Textarea
              id="footer"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Дополнительный текст в конце сообщения..."
              rows={3}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-border max-h-[400px] overflow-auto">
            {media.length > 0 && (
              <div className="mb-3 p-2 bg-muted/20 rounded border border-dashed border-muted-foreground/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {media[0].type === 'photo' && <Image className="w-4 h-4" />}
                  {media[0].type === 'video' && <Video className="w-4 h-4" />}
                  {media[0].type === 'document' && <File className="w-4 h-4" />}
                  {media[0].type === 'album' && <Image className="w-4 h-4" />}
                  <span>
                    {media.length === 1 
                      ? MEDIA_TYPE_LABELS[media[0].type]
                      : `Альбом (${media.length} файлов)`}
                  </span>
                </div>
              </div>
            )}
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans" 
                 dangerouslySetInnerHTML={{ __html: generatePreview() }} />
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Форматы текста:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>• <b>Жирный</b> — &lt;b&gt;текст&lt;/b&gt;</div>
              <div>• <i>Курсив</i> — &lt;i&gt;текст&lt;/i&gt;</div>
              <div>• <code>Код</code> — &lt;code&gt;текст&lt;/code&gt;</div>
              <div>• <code>Моно</code> — &lt;pre&gt;текст&lt;/pre&gt;</div>
              <div>• Цитата — &lt;blockquote&gt;</div>
              <div>• Ссылка — &lt;a href&gt;</div>
              <div>• Кнопка — inline keyboard</div>
              <div>• Кнопка-ссылка — URL кнопка</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CRMMessageConstructor() {
  const navigate = useNavigate();
  const { hasAccess, accessLevel, isLoading: accessLoading } = useCRMAccess();

  // Access control check
  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess || accessLevel !== 'admin') {
    return <AccessDenied message="Настройка сообщений доступна только администраторам CRM" />;
  }

  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <header className="border-b border-brass/20 bg-card/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/crm')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Конструктор сообщений</h1>
                <p className="text-sm text-muted-foreground">
                  Настройка уведомлений и сообщений клиентам
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Expert notification constructor */}
        <Card className="steampunk-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Уведомления экспертам (свайп вправо)
            </CardTitle>
            <CardDescription>
              Настройка сообщений в групповой чат при выборе эксперта
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MessageConstructorForm
              storageKey={MESSAGE_CONSTRUCTOR_STORAGE_KEY}
              title="Поля сообщения"
              description="Выберите какие данные клиента отправлять экспертам"
              defaultHeaderText="🔔 Новый выбор эксперта!"
            />
          </CardContent>
        </Card>

        {/* Client chat constructor */}
        <Card className="steampunk-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Сообщения клиентам из CRM
            </CardTitle>
            <CardDescription>
              Настройка шаблона сообщений из карточки клиента
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MessageConstructorForm
              storageKey={CHAT_CONSTRUCTOR_STORAGE_KEY}
              title="Поля сообщения"
              description="Выберите какие данные подставлять в сообщение клиенту"
              defaultHeaderText=""
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

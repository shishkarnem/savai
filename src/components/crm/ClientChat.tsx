import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Send, 
  Loader2, 
  MessageSquare, 
  AlertCircle, 
  Check, 
  CheckCheck,
  Settings,
  ChevronDown,
  FileText,
  Save,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import MacroEditor from '@/components/crm/MacroEditor';
import InlineButtonBuilder, { type InlineButtonRow } from '@/components/InlineButtonBuilder';
import { 
  type MediaAttachment,
  ALL_CRM_FIELDS,
} from '@/pages/CRMMessageConstructor';
import type { Tables } from '@/integrations/supabase/types';
import { resolveMacros, processMessageIntoParts, stripHtml } from '@/utils/messageParser';

type Client = Tables<'clients'>;

interface ClientChatProps {
  clientId: string;
  telegramId: string | null;
  clientName: string | null;
  clientData?: Client | null;
}

interface Message {
  id: string;
  client_id: string;
  telegram_id: string;
  direction: 'outgoing' | 'incoming';
  message: string;
  sent_at: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  error_message: string | null;
  created_at: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-primary" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
};

export const ClientChat: React.FC<ClientChatProps> = ({ clientId, telegramId, clientName, clientData }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [showConstructor, setShowConstructor] = useState(false);
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [useMediaCaption, setUseMediaCaption] = useState(false);
  const [inlineButtons, setInlineButtons] = useState<InlineButtonRow[]>([]);
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['client-messages', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('sent_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!clientId,
  });

  // Fetch saved chat templates
  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ['chat-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_messages',
        filter: `client_id=eq.${clientId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, queryClient]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Apply a saved template
  const applyTemplate = (templateId: string) => {
    if (!templates) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const rawFields = template.fields as any;
    const macroText = rawFields?.macroText || template.header_text || '';
    setMessage(prev => prev ? `${prev}\n\n${macroText}` : macroText);

    if (rawFields?.inlineButtons) {
      setInlineButtons(rawFields.inlineButtons);
    }
    if (rawFields?.disableWebPagePreview !== undefined) {
      setDisableWebPagePreview(rawFields.disableWebPagePreview);
    }

    if (template.media && Array.isArray(template.media) && template.media.length > 0) {
      setMedia(template.media as unknown as MediaAttachment[]);
      setUseMediaCaption(template.use_media_caption || false);
    }

    toast({ title: 'Шаблон применён' });
  };

  // Save current message as template
  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({ title: 'Введите название шаблона', variant: 'destructive' });
      return;
    }
    setIsSavingTemplate(true);
    try {
      const { error } = await supabase.from('notification_templates').insert([{
        name: newTemplateName.trim(),
        type: 'chat_message',
        header_text: '',
        footer_text: '',
        fields: { fieldsList: [], inlineButtons, macroText: message, disableWebPagePreview } as any,
        media: (media.length > 0 ? media : []) as any,
        use_media_caption: useMediaCaption,
        is_active: true,
      }]);
      if (error) throw error;
      setNewTemplateName('');
      refetchTemplates();
      toast({ title: 'Шаблон сохранён' });
    } catch {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Send message mutation — uses same logic as bulk send
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      // Resolve macros with client data
      const clientRecord = clientData as unknown as Record<string, unknown> | null;
      const resolvedText = clientRecord ? resolveMacros(text, clientRecord) : text;
      
      // Process into parts
      const parts = processMessageIntoParts(resolvedText);
      const uiMedia: MediaAttachment[] = media.filter(m => m.url.trim());

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFirst = i === 0;

        // Build media
        const partMedia: MediaAttachment[] = [];
        if (isFirst && uiMedia.length > 0) partMedia.push(...uiMedia);
        for (const pm of part.media) {
          partMedia.push({ id: crypto.randomUUID(), type: pm.type as any, url: pm.source });
        }
        for (const album of part.albums) {
          for (const source of album.sources) {
            partMedia.push({ id: crypto.randomUUID(), type: 'photo', url: source });
          }
        }

        // Buttons
        const partButtons = [...(isFirst ? inlineButtons : []), ...part.inlineButtons];
        const resolvedButtons = partButtons.length > 0
          ? partButtons.map(row => ({
              ...row,
              buttons: row.buttons.map(btn => ({
                ...btn,
                text: stripHtml(clientRecord ? resolveMacros(btn.text, clientRecord) : btn.text),
                url: btn.url ? (clientRecord ? resolveMacros(btn.url, clientRecord) : btn.url) : btn.url,
              })),
            }))
          : undefined;

        // Auto-enable caption mode when media comes from text commands
        const hasTextParsedMedia = part.media.length > 0 || part.albums.length > 0;
        const effectiveUseCaption = partMedia.length > 0 && (useMediaCaption || hasTextParsedMedia);

        const response = await supabase.functions.invoke('send-telegram-message', {
          body: {
            clientId,
            telegramId,
            message: part.text,
            media: partMedia.length > 0 ? partMedia : undefined,
            useMediaCaption: effectiveUseCaption,
            inlineButtons: resolvedButtons,
            disableWebPagePreview,
          },
        });
        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);

        if (i < parts.length - 1) await new Promise(r => setTimeout(r, 500));
      }

      // If no text but has media
      if (parts.length === 0 && uiMedia.length > 0) {
        const response = await supabase.functions.invoke('send-telegram-message', {
          body: {
            clientId,
            telegramId,
            message: '',
            media: uiMedia,
            useMediaCaption: false,
            disableWebPagePreview,
          },
        });
        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
      }
    },
    onSuccess: () => {
      setMessage('');
      setMedia([]);
      setInlineButtons([]);
      setUseMediaCaption(false);
      queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
      toast({ title: 'Сообщение отправлено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка отправки', description: error.message, variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
    },
  });

  const handleSend = () => {
    if (!message.trim() && media.filter(m => m.url.trim()).length === 0) return;
    if (!telegramId) {
      toast({ title: 'Ошибка', description: 'У клиента не указан Telegram ID', variant: 'destructive' });
      return;
    }
    sendMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!telegramId) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">У клиента не указан Telegram ID</p>
        <p className="text-xs mt-1">Отправка сообщений недоступна</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[60vh] sm:h-[500px]">
      {/* Chat header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Чат с клиентом</span>
        <Badge variant="secondary" className="text-xs ml-auto">
          ID: {telegramId}
        </Badge>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 py-3" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Нет сообщений</p>
            <p className="text-xs">Начните переписку</p>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {messages?.map((msg) => (
              <div key={msg.id} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.direction === 'outgoing' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-sm whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: msg.message }} />
                  <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] ${msg.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.sent_at), 'HH:mm', { locale: ru })}
                    </span>
                    {msg.direction === 'outgoing' && getStatusIcon(msg.status)}
                  </div>
                  {msg.status === 'failed' && msg.error_message && (
                    <p className="text-[10px] text-destructive mt-1">{msg.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Constructor toggle */}
      <Collapsible open={showConstructor} onOpenChange={setShowConstructor}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8 mt-2">
            <span className="flex items-center gap-2">
              <Settings className="h-3 w-3" />
              Конструктор сообщений
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showConstructor ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3 max-h-[300px] overflow-y-auto">
          {/* Template selector */}
          <div className="space-y-1.5">
            <Label className="text-[10px] flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Выбрать шаблон
            </Label>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger className="h-7 text-[10px]">
                <SelectValue placeholder="Выберите шаблон..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                ))}
                {(!templates || templates.length === 0) && (
                  <SelectItem value="__none" disabled className="text-xs text-muted-foreground">
                    Нет сохранённых шаблонов
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Save as template */}
          <div className="flex items-center gap-1.5">
            <Input
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="Название шаблона..."
              className="h-6 text-[10px] flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={saveAsTemplate}
              disabled={isSavingTemplate || !newTemplateName.trim()}
              className="h-6 px-2 text-[10px] gap-1"
            >
              {isSavingTemplate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Сохранить
            </Button>
          </div>

          {/* Macro Editor */}
          <MacroEditor
            value={message}
            onChange={setMessage}
            fields={ALL_CRM_FIELDS}
            media={media}
            onMediaChange={setMedia}
            useMediaCaption={useMediaCaption}
            onUseMediaCaptionChange={setUseMediaCaption}
            compact
            previewClient={clientData || null}
          />

          {/* Link preview toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={disableWebPagePreview}
              onCheckedChange={setDisableWebPagePreview}
              id="chatDisablePreview"
              className="scale-75"
            />
            <Label htmlFor="chatDisablePreview" className="text-[10px]">
              Отключить предпросмотр ссылок
            </Label>
          </div>

          {/* Inline Button Builder */}
          <InlineButtonBuilder
            rows={inlineButtons}
            onChange={setInlineButtons}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Input area (simple mode when constructor is closed) */}
      {!showConstructor && (
        <div className="pt-3 border-t border-border mt-2">
          <div className="flex gap-2">
            <textarea
              placeholder="Введите сообщение..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex min-h-[60px] max-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={sendMutation.isPending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={(!message.trim() && media.filter(m => m.url.trim()).length === 0) || sendMutation.isPending}
              className="shrink-0 self-end h-10 w-10"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Input area when constructor is open */}
      {showConstructor && (
        <div className="pt-3 border-t border-border mt-2">
          <Button
            onClick={handleSend}
            disabled={(!message.trim() && media.filter(m => m.url.trim()).length === 0) || sendMutation.isPending}
            className="w-full gap-2"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Отправить
          </Button>
        </div>
      )}
    </div>
  );
};

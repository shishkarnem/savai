import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  Image,
  Video,
  File,
  Plus,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  getChatConstructorSettings, 
  type MessageField, 
  type TextFormat,
  type MediaAttachment,
  type MediaType,
  FORMAT_LABELS
} from '@/pages/CRMMessageConstructor';
import type { Tables } from '@/integrations/supabase/types';

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

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  photo: '🖼 Фото',
  video: '🎬 Видео',
  document: '📄 Документ',
  album: '🗂 Альбом',
};

export const ClientChat: React.FC<ClientChatProps> = ({ clientId, telegramId, clientName, clientData }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [showConstructor, setShowConstructor] = useState(false);
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [useMediaCaption, setUseMediaCaption] = useState(false);
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_messages',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Format value based on format type
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

  // Build message from constructor
  const buildConstructorMessage = () => {
    if (!clientData) return '';
    
    const settings = getChatConstructorSettings();
    const enabledFields = settings.fields.filter(f => f.enabled);
    const lines: string[] = [];
    
    if (settings.headerText) {
      lines.push(settings.headerText);
      lines.push('');
    }
    
    for (const field of enabledFields) {
      const value = (clientData as Record<string, string | null>)[field.key];
      if (value) {
        let displayValue = value;
        
        // Handle special fields
        if (field.key === 'telegram_link') {
          const tgUsername = clientData.telegram_client?.replace('@', '');
          displayValue = tgUsername ? `https://t.me/${tgUsername}` : '';
        }
        
        if (displayValue) {
          const formattedValue = formatValue(field.format, displayValue, field.buttonText);
          lines.push(`${field.label}: ${formattedValue}`);
        }
      }
    }
    
    if (settings.footerText) {
      lines.push('');
      lines.push(settings.footerText);
    }
    
    return lines.join('\n');
  };

  const insertConstructorMessage = () => {
    const constructedMessage = buildConstructorMessage();
    setMessage(prev => prev ? `${prev}\n\n${constructedMessage}` : constructedMessage);
    
    // Also apply media settings
    const settings = getChatConstructorSettings();
    if (settings.media && settings.media.length > 0) {
      setMedia(settings.media);
      setUseMediaCaption(settings.useMediaCaption);
    }
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

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const validMedia = media.filter(m => m.url.trim());
      
      const response = await supabase.functions.invoke('send-telegram-message', {
        body: {
          clientId,
          telegramId,
          message: text,
          media: validMedia.length > 0 ? validMedia : undefined,
          useMediaCaption: validMedia.length > 0 ? useMediaCaption : false,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      setMessage('');
      setMedia([]);
      setUseMediaCaption(false);
      queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
      toast({
        title: 'Сообщение отправлено',
        description: `Сообщение доставлено в Telegram`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка отправки',
        description: error.message,
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
    },
  });

  const handleSend = () => {
    if (!message.trim() && media.filter(m => m.url.trim()).length === 0) return;
    if (!telegramId) {
      toast({
        title: 'Ошибка',
        description: 'У клиента не указан Telegram ID',
        variant: 'destructive',
      });
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
    <div className="flex flex-col h-[500px]">
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
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.direction === 'outgoing'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className={`flex items-center gap-1 mt-1 ${
                    msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span className={`text-[10px] ${
                      msg.direction === 'outgoing' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {format(new Date(msg.sent_at), 'HH:mm', { locale: ru })}
                    </span>
                    {msg.direction === 'outgoing' && getStatusIcon(msg.status)}
                  </div>
                  {msg.status === 'failed' && msg.error_message && (
                    <p className="text-[10px] text-destructive mt-1">
                      {msg.error_message}
                    </p>
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
        <CollapsibleContent className="pt-2 space-y-3">
          {/* Insert template */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={insertConstructorMessage}
            className="w-full text-xs"
            disabled={!clientData}
          >
            Вставить шаблон из настроек
          </Button>
          
          {/* Media attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Медиафайлы</Label>
              <Button variant="ghost" size="sm" onClick={addMedia} className="h-6 px-2 text-xs gap-1">
                <Plus className="w-3 h-3" />
                Добавить
              </Button>
            </div>
            
            {media.length > 0 && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={useMediaCaption}
                  onCheckedChange={setUseMediaCaption}
                  id="useCaption"
                  className="scale-75"
                />
                <Label htmlFor="useCaption" className="text-xs">
                  Текст как подпись
                </Label>
              </div>
            )}
            
            {media.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Select
                  value={m.type}
                  onValueChange={(value: MediaType) => updateMedia(m.id, { type: value })}
                >
                  <SelectTrigger className="w-24 h-7 text-xs">
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
                  className="flex-1 h-7 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeMedia(m.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Media preview */}
      {media.filter(m => m.url.trim()).length > 0 && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
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

      {/* Input area */}
      <div className="pt-3 border-t border-border mt-2">
        <div className="flex gap-2">
          <Textarea
            placeholder="Введите сообщение..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
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
        <p className="text-[10px] text-muted-foreground mt-1">
          Enter — отправить, Shift+Enter — новая строка
        </p>
      </div>
    </div>
  );
};

export default ClientChat;

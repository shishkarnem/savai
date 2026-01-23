import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, MessageSquare, AlertCircle, Check, CheckCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ClientChatProps {
  clientId: string;
  telegramId: string | null;
  clientName: string | null;
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

export const ClientChat: React.FC<ClientChatProps> = ({ clientId, telegramId, clientName }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
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

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await supabase.functions.invoke('send-telegram-message', {
        body: {
          clientId,
          telegramId,
          message: text,
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
    if (!message.trim()) return;
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
    <div className="flex flex-col h-[400px]">
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

      {/* Input area */}
      <div className="pt-3 border-t border-border">
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
            disabled={!message.trim() || sendMutation.isPending}
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

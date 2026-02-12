import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Send, UserCheck, RefreshCw, Trash2, X, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import MacroEditor from '@/components/crm/MacroEditor';
import InlineButtonBuilder, { type InlineButtonRow } from '@/components/InlineButtonBuilder';
import { CLIENT_STATUSES } from '@/components/crm/CRMFilters';
import type { Tables } from '@/integrations/supabase/types';
import type { MessageField, MediaAttachment } from '@/pages/CRMMessageConstructor';
import { ALL_CRM_FIELDS } from '@/pages/CRMMessageConstructor';

type Client = Tables<'clients'>;

interface BulkActionsBarProps {
  selectedIds: Set<string>;
  clients: Client[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

/** Replace macros like {{full_name}} with actual client values */
function resolveMacros(text: string, client: Client): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === 'telegram_link') {
      return client.telegram_client
        ? `https://t.me/${client.telegram_client.replace('@', '')}`
        : client.telegram_id
          ? `tg://user?id=${client.telegram_id}`
          : '';
    }
    return (client as Record<string, unknown>)[key]?.toString() ?? '';
  });
}

/** Split message by manual separators or char limits */
function splitMessage(text: string, hasMedia: boolean, useCaption: boolean): string[] {
  // First split by manual separators
  const parts = text.split(/✂️✂️✂️|::/).map(p => p.trim()).filter(Boolean);
  
  const limit = hasMedia && useCaption ? 1000 : 4000;
  const result: string[] = [];
  
  for (const part of parts) {
    if (part.length <= limit) {
      result.push(part);
    } else {
      // Split by limit
      let remaining = part;
      while (remaining.length > 0) {
        if (remaining.length <= limit) {
          result.push(remaining);
          break;
        }
        let splitIdx = remaining.lastIndexOf('\n', limit);
        if (splitIdx < limit * 0.3) splitIdx = remaining.lastIndexOf(' ', limit);
        if (splitIdx < limit * 0.3) splitIdx = limit;
        result.push(remaining.slice(0, splitIdx).trim());
        remaining = remaining.slice(splitIdx).trim();
      }
    }
  }
  return result;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedIds,
  clients,
  onClearSelection,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [sendOpen, setSendOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Send message state
  const [messageText, setMessageText] = useState('');
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [useMediaCaption, setUseMediaCaption] = useState(false);
  const [inlineButtons, setInlineButtons] = useState<InlineButtonRow[]>([]);

  // Status change state
  const [newStatus, setNewStatus] = useState('');

  // Expert assign state
  const [selectedExpert, setSelectedExpert] = useState('');

  const selectedClients = clients.filter(c => selectedIds.has(c.id));
  const count = selectedIds.size;

  // Fetch experts
  const { data: experts } = useQuery({
    queryKey: ['experts-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('experts').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['bulk-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleLoadTemplate = (templateId: string) => {
    const t = templates?.find(t => t.id === templateId);
    if (!t) return;
    setMessageText(t.header_text || '');
    setMedia((t.media as unknown as MediaAttachment[]) || []);
    setUseMediaCaption(t.use_media_caption || false);
    // Load inline buttons from template fields
    const rawFields = t.fields as any;
    if (rawFields && !Array.isArray(rawFields) && rawFields.inlineButtons) {
      setInlineButtons(rawFields.inlineButtons);
    } else {
      setInlineButtons([]);
    }
    if (rawFields && !Array.isArray(rawFields) && rawFields.macroText) {
      setMessageText(rawFields.macroText);
    }
  };

  // --- BULK SEND MESSAGES ---
  const handleBulkSend = async () => {
    const withTelegram = selectedClients.filter(c => c.telegram_id);
    if (withTelegram.length === 0) {
      toast({ title: 'Ошибка', description: 'Нет клиентов с Telegram ID', variant: 'destructive' });
      return;
    }
    if (!messageText.trim() && !media.some(m => m.url.trim())) {
      toast({ title: 'Ошибка', description: 'Введите текст или добавьте медиа', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    let sent = 0;
    let failed = 0;

    for (const client of withTelegram) {
      try {
        const resolvedText = resolveMacros(messageText, client);
        const hasMediaFiles = media.some(m => m.url.trim());
        const parts = splitMessage(resolvedText, hasMediaFiles, useMediaCaption);

        for (let i = 0; i < parts.length; i++) {
          const isFirst = i === 0;
          const partMedia = isFirst && hasMediaFiles ? media.filter(m => m.url.trim()) : undefined;

          const isLast = i === parts.length - 1;
          // Resolve macros in inline button URLs/text too
          const resolvedButtons = isLast && inlineButtons.length > 0
            ? inlineButtons.map(row => ({
                ...row,
                buttons: row.buttons.map(btn => ({
                  ...btn,
                  text: resolveMacros(btn.text, client),
                  url: btn.url ? resolveMacros(btn.url, client) : btn.url,
                  callbackData: btn.callbackData ? resolveMacros(btn.callbackData, client) : btn.callbackData,
                })),
              }))
            : undefined;

          await supabase.functions.invoke('send-telegram-message', {
            body: {
              clientId: client.id,
              telegramId: client.telegram_id,
              message: parts[i],
              media: partMedia,
              useMediaCaption: isFirst && useMediaCaption,
              inlineButtons: resolvedButtons,
            },
          });

          // Small delay between parts
          if (i < parts.length - 1) await new Promise(r => setTimeout(r, 500));
        }
        sent++;
      } catch {
        failed++;
      }
      // Delay between clients to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    toast({
      title: 'Массовая рассылка завершена',
      description: `Отправлено: ${sent}, ошибок: ${failed}`,
    });
    setIsProcessing(false);
    setSendOpen(false);
    setMessageText('');
    setMedia([]);
    setInlineButtons([]);
  };

  // --- BULK STATUS CHANGE ---
  const handleBulkStatusChange = async () => {
    if (!newStatus) return;
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .in('id', ids);
      if (error) throw error;
      toast({ title: 'Статусы обновлены', description: `${count} клиентов → ${newStatus}` });
      onRefresh();
      setStatusOpen(false);
      onClearSelection();
    } catch (err) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статусы', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BULK ASSIGN EXPERT ---
  const handleBulkAssignExpert = async () => {
    if (!selectedExpert) return;
    setIsProcessing(true);
    try {
      const expert = experts?.find(e => e.pseudonym === selectedExpert || e.id === selectedExpert);
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('clients')
        .update({
          expert_pseudonym: expert?.pseudonym || selectedExpert,
          expert_name: expert?.pseudonym || selectedExpert,
        })
        .in('id', ids);
      if (error) throw error;
      toast({ title: 'Эксперт назначен', description: `${count} клиентов → ${expert?.pseudonym || selectedExpert}` });
      onRefresh();
      setExpertOpen(false);
      onClearSelection();
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось назначить эксперта', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BULK DELETE ---
  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('clients')
        .delete()
        .in('id', ids);
      if (error) throw error;
      toast({ title: 'Удалено', description: `${count} клиентов удалено` });
      onRefresh();
      setDeleteOpen(false);
      onClearSelection();
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить клиентов', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (count === 0) return null;

  return (
    <>
      {/* Floating toolbar */}
      <div className="sticky bottom-4 z-20 flex justify-center">
        <div className="bg-card border border-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {count} выбрано
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClearSelection}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border" />

          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSendOpen(true)}>
            <Send className="w-4 h-4" />
            Отправить сообщения
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStatusOpen(true)}>
            <RefreshCw className="w-4 h-4" />
            Сменить статус
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setExpertOpen(true)}>
            <UserCheck className="w-4 h-4" />
            Назначить эксперта
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4" />
            Удалить
          </Button>
        </div>
      </div>

      {/* --- Send Messages Dialog --- */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Массовая отправка сообщений
            </DialogTitle>
            <DialogDescription>
              Будет отправлено {selectedClients.filter(c => c.telegram_id).length} клиентам с Telegram ID.
              {selectedClients.filter(c => !c.telegram_id).length > 0 && (
                <span className="text-destructive ml-1">
                  ({selectedClients.filter(c => !c.telegram_id).length} без Telegram ID — пропущены)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Template selector */}
          {templates && templates.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <Select onValueChange={handleLoadTemplate}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Загрузить шаблон..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <MacroEditor
            value={messageText}
            onChange={setMessageText}
            fields={ALL_CRM_FIELDS}
            media={media}
            onMediaChange={setMedia}
            useMediaCaption={useMediaCaption}
            onUseMediaCaptionChange={setUseMediaCaption}
          />

          <InlineButtonBuilder
            rows={inlineButtons}
            onChange={setInlineButtons}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>Отмена</Button>
            <Button onClick={handleBulkSend} disabled={isProcessing} className="gap-2">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Отправить {selectedClients.filter(c => c.telegram_id).length} клиентам
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Change Status Dialog --- */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сменить статус ({count} клиентов)</DialogTitle>
          </DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите новый статус" />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Отмена</Button>
            <Button onClick={handleBulkStatusChange} disabled={isProcessing || !newStatus} className="gap-2">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Assign Expert Dialog --- */}
      <Dialog open={expertOpen} onOpenChange={setExpertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить эксперта ({count} клиентов)</DialogTitle>
          </DialogHeader>
          <Select value={selectedExpert} onValueChange={setSelectedExpert}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите эксперта" />
            </SelectTrigger>
            <SelectContent>
              {experts?.map(e => (
                <SelectItem key={e.id} value={e.pseudonym || e.id}>
                  {e.pseudonym || e.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpertOpen(false)}>Отмена</Button>
            <Button onClick={handleBulkAssignExpert} disabled={isProcessing || !selectedExpert} className="gap-2">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Назначить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmation --- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {count} клиентов?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все данные выбранных клиентов будут удалены из базы данных.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsBar;

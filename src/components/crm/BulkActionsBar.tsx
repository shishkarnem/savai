import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
import { Send, UserCheck, RefreshCw, Trash2, X, Loader2, FileText, Save, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MacroEditor from '@/components/crm/MacroEditor';
import InlineButtonBuilder, { type InlineButtonRow } from '@/components/InlineButtonBuilder';
import { CLIENT_STATUSES } from '@/components/crm/CRMFilters';
import type { Tables } from '@/integrations/supabase/types';
import type { MediaAttachment } from '@/pages/CRMMessageConstructor';
import { ALL_CRM_FIELDS } from '@/pages/CRMMessageConstructor';
import { resolveMacros, processMessageIntoParts, stripHtml } from '@/utils/messageParser';

type Client = Tables<'clients'>;

interface BulkActionsBarProps {
  selectedIds: Set<string>;
  clients: Client[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedIds,
  clients,
  onClearSelection,
  onRefresh,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(false);

  // Save template state
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Progress state
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });

  // Preview state
  const [previewClientIdx, setPreviewClientIdx] = useState<number>(0);

  // Status change state
  const [newStatus, setNewStatus] = useState('');

  // Expert assign state
  const [selectedExpert, setSelectedExpert] = useState('');

  const selectedClients = clients.filter(c => selectedIds.has(c.id));
  const count = selectedIds.size;
  const withTelegram = selectedClients.filter(c => c.telegram_id);

  // Preview client for macro resolution
  const previewClient = withTelegram[previewClientIdx] || withTelegram[0] || null;

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
  const { data: templates, refetch: refetchTemplates } = useQuery({
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
    const rawFields = t.fields as any;
    if (rawFields && !Array.isArray(rawFields) && rawFields.inlineButtons) {
      setInlineButtons(rawFields.inlineButtons);
    } else {
      setInlineButtons([]);
    }
    if (rawFields && !Array.isArray(rawFields) && rawFields.macroText) {
      setMessageText(rawFields.macroText);
    }
    if (rawFields && rawFields.disableWebPagePreview !== undefined) {
      setDisableWebPagePreview(rawFields.disableWebPagePreview);
    }
  };

  // Save current settings as template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({ title: 'Введите название шаблона', variant: 'destructive' });
      return;
    }
    setIsSavingTemplate(true);
    try {
      const { error } = await supabase.from('notification_templates').insert([{
        name: templateName.trim(),
        type: 'bulk_message',
        header_text: '',
        footer_text: '',
        fields: { fieldsList: [], inlineButtons, macroText: messageText, disableWebPagePreview } as any,
        media: (media.length > 0 ? media : []) as any,
        use_media_caption: useMediaCaption,
        is_active: true,
      }]);
      if (error) throw error;
      setTemplateName('');
      refetchTemplates();
      toast({ title: 'Шаблон сохранён' });
    } catch {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // --- BULK SEND MESSAGES ---
  const handleBulkSend = async () => {
    if (withTelegram.length === 0) {
      toast({ title: 'Ошибка', description: 'Нет клиентов с Telegram ID', variant: 'destructive' });
      return;
    }
    if (!messageText.trim() && !media.some(m => m.url.trim())) {
      toast({ title: 'Ошибка', description: 'Введите текст или добавьте медиа', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    const total = withTelegram.length;
    setSendProgress({ sent: 0, failed: 0, total });

    const BATCH_SIZE = 25;
    const BATCH_DELAY = 1500;
    const INTER_MSG_DELAY = 200;

    let sent = 0;
    let failed = 0;

    for (let batchStart = 0; batchStart < withTelegram.length; batchStart += BATCH_SIZE) {
      const batch = withTelegram.slice(batchStart, batchStart + BATCH_SIZE);
      
      for (const client of batch) {
        try {
          // Resolve macros in raw text (before parsing commands)
          const resolvedText = resolveMacros(messageText, client as unknown as Record<string, unknown>);
          
          // Process into independent parts (each gets its own buttons/media)
          const parts = processMessageIntoParts(resolvedText);
          
          // UI-attached media
          const uiMedia: MediaAttachment[] = media.filter(m => m.url.trim());
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFirst = i === 0;
            
            // Build media array: UI media on first part + text-parsed media on each part
            const partMedia: MediaAttachment[] = [];
            if (isFirst && uiMedia.length > 0) {
              partMedia.push(...uiMedia);
            }
            // Convert text-parsed media to MediaAttachment format
            for (const pm of part.media) {
              partMedia.push({
                id: crypto.randomUUID(),
                type: pm.type as any, // video_note, audio etc
                url: pm.source,
              });
            }
            // Convert albums to individual photo items
            for (const album of part.albums) {
              for (const source of album.sources) {
                partMedia.push({ id: crypto.randomUUID(), type: 'photo', url: source });
              }
            }
            
            // Combine UI buttons (first part only) + text-parsed buttons
            const partButtons = [...(isFirst ? inlineButtons : []), ...part.inlineButtons];
            
            // Resolve macros in buttons and STRIP HTML from button text
            const resolvedButtons = partButtons.length > 0
              ? partButtons.map(row => ({
                  ...row,
                  buttons: row.buttons.map(btn => ({
                    ...btn,
                    text: stripHtml(resolveMacros(btn.text, client as unknown as Record<string, unknown>)),
                    url: btn.url ? resolveMacros(btn.url, client as unknown as Record<string, unknown>) : btn.url,
                    callbackData: btn.callbackData ? resolveMacros(btn.callbackData, client as unknown as Record<string, unknown>) : btn.callbackData,
                  })),
                }))
              : undefined;

            // Auto-enable caption mode when media comes from text commands
            const hasTextParsedMedia = part.media.length > 0 || part.albums.length > 0;
            const effectiveUseCaption = partMedia.length > 0 && (useMediaCaption || hasTextParsedMedia);

            await supabase.functions.invoke('send-telegram-message', {
              body: {
                clientId: client.id,
                telegramId: client.telegram_id,
                message: part.text,
                media: partMedia.length > 0 ? partMedia : undefined,
                useMediaCaption: effectiveUseCaption,
                inlineButtons: resolvedButtons,
                disableWebPagePreview,
              },
            });

            if (i < parts.length - 1) await new Promise(r => setTimeout(r, 500));
          }
          sent++;
        } catch {
          failed++;
        }
        setSendProgress({ sent: sent + failed, failed, total });
        await new Promise(r => setTimeout(r, INTER_MSG_DELAY));
      }

      if (batchStart + BATCH_SIZE < withTelegram.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
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
    setSendProgress({ sent: 0, failed: 0, total: 0 });
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
    } catch {
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

  const progressPercent = sendProgress.total > 0 ? Math.round((sendProgress.sent / sendProgress.total) * 100) : 0;

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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden w-[95vw] sm:w-full mx-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Массовая отправка сообщений
            </DialogTitle>
            <DialogDescription>
              Будет отправлено {withTelegram.length} клиентам с Telegram ID.
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

          {/* Save as template */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
            <Input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Название шаблона для сохранения..."
              className="h-7 text-xs flex-1 min-w-0"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
              className="h-7 px-2 text-xs gap-1 w-full sm:w-auto"
            >
              {isSavingTemplate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Сохранить
            </Button>
          </div>

          {/* Macro editor */}
          <MacroEditor
            value={messageText}
            onChange={setMessageText}
            fields={ALL_CRM_FIELDS}
            media={media}
            onMediaChange={setMedia}
            useMediaCaption={useMediaCaption}
            onUseMediaCaptionChange={setUseMediaCaption}
            previewClient={previewClient}
          />

          {/* Link preview toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={disableWebPagePreview}
              onCheckedChange={setDisableWebPagePreview}
              id="bulkDisablePreview"
              className="scale-75"
            />
            <Label htmlFor="bulkDisablePreview" className="text-[10px]">
              Отключить предпросмотр ссылок в сообщении
            </Label>
          </div>

          {/* Preview client selector */}
          {withTelegram.length > 0 && (
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <Select
                value={String(previewClientIdx)}
                onValueChange={(v) => setPreviewClientIdx(Number(v))}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue placeholder="Предпросмотр для клиента..." />
                </SelectTrigger>
                <SelectContent>
                  {withTelegram.slice(0, 20).map((c, i) => (
                    <SelectItem key={c.id} value={String(i)} className="text-xs">
                      {c.full_name || c.telegram_client || c.telegram_id || `Клиент ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <InlineButtonBuilder
            rows={inlineButtons}
            onChange={setInlineButtons}
          />

          {/* Progress bar */}
          {isProcessing && sendProgress.total > 0 && (
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Отправлено: {sendProgress.sent - sendProgress.failed} / {sendProgress.total}</span>
                {sendProgress.failed > 0 && (
                  <span className="text-destructive">Ошибок: {sendProgress.failed}</span>
                )}
                <span>{progressPercent}%</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={isProcessing}>Отмена</Button>
            <Button onClick={handleBulkSend} disabled={isProcessing} className="gap-2">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Отправить {withTelegram.length} клиентам
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

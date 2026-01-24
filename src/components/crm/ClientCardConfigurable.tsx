import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, MapPin, Calendar, Briefcase, 
  DollarSign, MessageSquare, Bot, ExternalLink, FileText, Send, RefreshCw,
  Download, X, ZoomIn
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { CardSection } from '@/hooks/useCRMSettings';
import { SettingsConstructor } from './SettingsConstructor';
import { ClientChat } from './ClientChat';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Client = Tables<'clients'>;
type TelegramProfile = Tables<'telegram_profiles'>;

interface ClientCardConfigurableProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardSections: CardSection[];
  onToggleCardSection: (key: string) => void;
  onResetCardSections: () => void;
}

const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'Выполнено':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'В работе':
    case 'Обслуживание':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Отказ':
    case 'Заблокировано':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'Инфо':
    case 'Расчет':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Договор':
    case 'Предоплата':
    case 'Тариф':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Подбор Эксперта':
    case 'Эксперт':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const InfoRow: React.FC<{ label: string; value: string | null | undefined; icon?: React.ReactNode }> = ({ 
  label, value, icon 
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1">
    <h3 className="text-sm font-semibold text-primary">{title}</h3>
    <div className="pl-1">{children}</div>
  </div>
);

export const ClientCardConfigurable: React.FC<ClientCardConfigurableProps> = ({ 
  client, 
  open, 
  onOpenChange,
  cardSections,
  onToggleCardSection,
  onResetCardSections,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info');
  const [isSyncing, setIsSyncing] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch telegram profile by telegram_id
  const { data: telegramProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['telegram-profile', client?.telegram_id],
    queryFn: async () => {
      if (!client?.telegram_id) return null;
      const telegramIdNum = parseInt(client.telegram_id, 10);
      if (isNaN(telegramIdNum)) return null;
      
      const { data, error } = await supabase
        .from('telegram_profiles')
        .select('*')
        .eq('telegram_id', telegramIdNum)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching telegram profile:', error);
        return null;
      }
      return data as TelegramProfile | null;
    },
    enabled: open && !!client?.telegram_id,
  });

  // Auto-sync telegram profile when opening card if no profile exists
  useEffect(() => {
    const syncProfile = async () => {
      if (!open || !client?.telegram_id || telegramProfile !== null || isSyncing) return;
      
      // Only sync if we've checked and found no profile (telegramProfile is null, not undefined)
      const telegramIdNum = parseInt(client.telegram_id, 10);
      if (isNaN(telegramIdNum)) return;

      setIsSyncing(true);
      try {
        const { data, error } = await supabase.functions.invoke('sync-telegram-profile', {
          body: { telegram_id: client.telegram_id },
        });

        if (!error && data?.success) {
          // Refetch profile after sync
          await refetchProfile();
          console.log('Auto-synced telegram profile:', data);
        }
      } catch (err) {
        console.log('Auto-sync skipped:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    // Small delay to let initial query complete
    const timer = setTimeout(syncProfile, 500);
    return () => clearTimeout(timer);
  }, [open, client?.telegram_id, telegramProfile, isSyncing, refetchProfile]);

  // Manual sync handler
  const handleManualSync = async () => {
    if (!client?.telegram_id || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-telegram-profile', {
        body: { telegram_id: client.telegram_id },
      });

      if (error) {
        toast({
          title: 'Ошибка синхронизации',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        await refetchProfile();
        toast({
          title: 'Профиль обновлён',
          description: `Данные из Telegram ${data.action === 'created' ? 'загружены' : 'обновлены'}`,
        });
      } else {
        toast({
          title: 'Не удалось получить профиль',
          description: data?.error || 'Пользователь не взаимодействовал с ботом',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось синхронизировать профиль',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!client) return null;

  const isSectionVisible = (key: string) => 
    cardSections.find(s => s.key === key)?.visible ?? true;

  // Build telegram link
  const getTelegramLink = () => {
    if (telegramProfile?.username) {
      return `https://t.me/${telegramProfile.username}`;
    }
    if (client.telegram_client) {
      // Remove @ if present
      const username = client.telegram_client.replace('@', '');
      return `https://t.me/${username}`;
    }
    if (client.telegram_id) {
      return `tg://user?id=${client.telegram_id}`;
    }
    return null;
  };

  const telegramLink = getTelegramLink();

  // Get display name from telegram profile
  const getProfileDisplayName = () => {
    if (!telegramProfile) return null;
    const parts = [telegramProfile.first_name, telegramProfile.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  };

  // Download photo handler
  const handleDownloadPhoto = async () => {
    if (!telegramProfile?.photo_url) return;
    
    try {
      const response = await fetch(telegramProfile.photo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.full_name || telegramProfile.username || 'profile'}_photo.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(telegramProfile.photo_url, '_blank');
    }
  };

  const hasPhoto = !!telegramProfile?.photo_url;

  return (
    <>
      {/* Photo Preview Modal */}
      <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
        <DialogContent className="max-w-md p-0 bg-background/95 backdrop-blur-sm">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPhotoPreviewOpen(false)}
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Photo */}
            <div className="p-4 pt-12">
              <div className="rounded-lg overflow-hidden border border-border">
                <img 
                  src={telegramProfile?.photo_url || ''} 
                  alt={client.full_name || 'Profile photo'}
                  className="w-full h-auto object-cover"
                />
              </div>
              
              {/* Info */}
              <div className="mt-4 text-center">
                <h3 className="font-semibold text-lg">
                  {getProfileDisplayName() || client.full_name || 'Без имени'}
                </h3>
                {telegramProfile?.username && (
                  <p className="text-sm text-muted-foreground">@{telegramProfile.username}</p>
                )}
              </div>
              
              {/* Download button */}
              <Button
                onClick={handleDownloadPhoto}
                className="w-full mt-4 gap-2"
              >
                <Download className="h-4 w-4" />
                Скачать фото
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Client Card Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Telegram Profile Avatar */}
                <div className="relative group">
                  <Avatar 
                    className={`h-14 w-14 border-2 border-primary/20 ${hasPhoto ? 'cursor-pointer' : ''}`}
                    onClick={() => hasPhoto && setPhotoPreviewOpen(true)}
                  >
                    <AvatarImage 
                      src={telegramProfile?.photo_url || undefined} 
                      alt={client.full_name || 'Client'} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {(client.full_name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Zoom indicator on hover */}
                  {hasPhoto && (
                    <div 
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => setPhotoPreviewOpen(true)}
                    >
                      <ZoomIn className="h-5 w-5 text-white" />
                    </div>
                  )}
                  
                  {/* Sync button on avatar */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleManualSync(); }}
                    disabled={isSyncing || !client.telegram_id}
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-border"
                    title="Синхронизировать профиль Telegram"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  </Button>
              </div>

              <div>
                <DialogTitle className="text-xl">
                  {client.full_name || 'Без имени'}
                </DialogTitle>
                
                {/* Telegram profile name if different */}
                {getProfileDisplayName() && getProfileDisplayName() !== client.full_name && (
                  <p className="text-sm text-muted-foreground">
                    Telegram: {getProfileDisplayName()}
                    {telegramProfile?.username && (
                      <span className="text-primary ml-1">@{telegramProfile.username}</span>
                    )}
                  </p>
                )}
                
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className={getStatusColor(client.status)}>
                    {client.status || 'Нет статуса'}
                  </Badge>
                  {client.project_code && (
                    <Badge variant="secondary" className="font-mono">
                      {client.project_code}
                    </Badge>
                  )}
                  
                  {/* Telegram Link Button */}
                  {telegramLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-1.5 h-6 px-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="h-3 w-3" />
                        Открыть Telegram
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <SettingsConstructor
              mode="card"
              cardSections={cardSections}
              onToggleCardSection={onToggleCardSection}
              onResetCardSections={onResetCardSections}
            />
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'info' | 'chat')} className="flex-1">
          <div className="px-6 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="gap-2">
                <FileText className="h-4 w-4" />
                Информация
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <Send className="h-4 w-4" />
                Чат
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info" className="m-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[55vh]">
              <div className="p-6 space-y-6">
                {/* Контактные данные */}
                {isSectionVisible('contacts') && (
                  <>
                    <Section title="Контактные данные">
                      <InfoRow 
                        label="Telegram ID" 
                        value={client.telegram_id} 
                        icon={<User className="h-4 w-4" />} 
                      />
                      <InfoRow 
                        label="Telegram" 
                        value={client.telegram_client} 
                        icon={<MessageSquare className="h-4 w-4" />} 
                      />
                      <InfoRow 
                        label="Город" 
                        value={client.city} 
                        icon={<MapPin className="h-4 w-4" />} 
                      />
                    </Section>
                    <Separator />
                  </>
                )}

                {/* Проект */}
                {isSectionVisible('project') && (
                  <>
                    <Section title="Проект">
                      <InfoRow label="Название проекта" value={client.project} icon={<Briefcase className="h-4 w-4" />} />
                      <InfoRow label="Продукт" value={client.product} />
                      <InfoRow label="Подразделение" value={client.department} />
                      <InfoRow label="Сотрудников" value={client.employees_count} />
                      <InfoRow label="Функционал" value={client.functionality} />
                      <InfoRow label="Обслуживание" value={client.service} />
                    </Section>
                    <Separator />
                  </>
                )}

                {/* Эксперт и тариф */}
                {isSectionVisible('expert') && (
                  <>
                    <Section title="Эксперт и тариф">
                      <InfoRow label="Эксперт" value={client.expert_name} />
                      <InfoRow label="Псевдоним эксперта" value={client.expert_pseudonym} />
                      <InfoRow label="Выбранный эксперт" value={client.selected_expert} />
                      <InfoRow label="Тариф" value={client.tariff} />
                    </Section>
                    <Separator />
                  </>
                )}

                {/* Финансы */}
                {isSectionVisible('finance') && (
                  <>
                    <Section title="Финансы">
                      <InfoRow 
                        label="Стоимость SAV" 
                        value={client.sav_cost} 
                        icon={<DollarSign className="h-4 w-4" />} 
                      />
                      <InfoRow label="Цена обслуживания" value={client.service_price} />
                      <InfoRow label="Цена софта" value={client.software_price} />
                      <InfoRow label="Цена ИИ токенов" value={client.ai_tokens_price} />
                      <InfoRow label="Средняя ЗП" value={client.avg_salary} />
                      <InfoRow label="ЗП региона" value={client.region_salary} />
                      <InfoRow label="Реальная ЗП" value={client.real_salary} />
                      <InfoRow label="Стоимость ИИ сотрудника" value={client.ai_employee_cost} />
                      <InfoRow label="Окупаемость" value={client.payback} />
                      <InfoRow label="Сумма возврата" value={client.refund_amount} />
                    </Section>
                    <Separator />
                  </>
                )}

                {/* Даты */}
                {isSectionVisible('dates') && (
                  <>
                    <Section title="Важные даты">
                      <div className="grid grid-cols-2 gap-2">
                        <InfoRow 
                          label="Дата калькулятора" 
                          value={client.calculator_date} 
                          icon={<Calendar className="h-4 w-4" />} 
                        />
                        <InfoRow label="Дата старта" value={client.start_date} />
                        <InfoRow label="Дата эксперта" value={client.expert_date} />
                        <InfoRow label="Дата тарифа" value={client.tariff_date} />
                        <InfoRow label="Дата старта работ" value={client.work_start_date} />
                        <InfoRow label="Дата оплаты" value={client.payment_date} />
                        <InfoRow label="Дата старта обслуживания" value={client.service_start_date} />
                        <InfoRow label="Дата конца работ" value={client.work_end_date} />
                        <InfoRow label="Дата акта" value={client.act_date} />
                        <InfoRow label="Дата отказа" value={client.rejection_date} />
                        <InfoRow label="Дата блокировки" value={client.block_date} />
                      </div>
                    </Section>
                    <Separator />
                  </>
                )}

                {/* ProTalk бот */}
                {isSectionVisible('protalk') && (
                  <>
                    <Section title="Telegram бот (ProTalk)">
                      <InfoRow 
                        label="ProTalk ID" 
                        value={client.protalk_id} 
                        icon={<Bot className="h-4 w-4" />} 
                      />
                      <InfoRow label="ProTalk имя" value={client.protalk_name} />
                      <InfoRow label="Статус отправки ProTalk" value={client.protalk_send_status} />
                      <InfoRow label="Канал" value={client.channel} />
                      <InfoRow label="Последнее сообщение" value={client.last_message} />
                    </Section>
                    <Separator />
                  </>
                )}

                {/* История сообщений */}
                {isSectionVisible('last_100_messages') && client.last_100_messages && (
                  <>
                    <Section title="История сообщений (последние 100)">
                      <div className="bg-muted/30 rounded-lg p-3 border border-border">
                        <ScrollArea className="max-h-60">
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans">
                            {client.last_100_messages}
                          </pre>
                        </ScrollArea>
                      </div>
                    </Section>
                    <Separator />
                  </>
                )}

                {/* Ссылки */}
                {isSectionVisible('documents') && (client.contract_ooo_url || client.contract_ip_url || client.project_plan_url) && (
                  <>
                    <Section title="Документы">
                      {client.contract_ooo_url && (
                        <a 
                          href={client.contract_ooo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Договор ООО
                        </a>
                      )}
                      {client.contract_ip_url && (
                        <a 
                          href={client.contract_ip_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Договор ИП
                        </a>
                      )}
                      {client.project_plan_url && (
                        <a 
                          href={client.project_plan_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          План проекта
                        </a>
                      )}
                    </Section>
                    <Separator />
                  </>
                )}

                {/* Комментарий */}
                {isSectionVisible('comment') && client.comment && (
                  <>
                    <Section title="Комментарий">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {client.comment}
                      </p>
                    </Section>
                    <Separator />
                  </>
                )}

                {/* КП текст */}
                {isSectionVisible('kp') && client.kp_text && (
                  <Section title="Текст КП">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {client.kp_text}
                    </p>
                  </Section>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="m-0 px-6 pb-6">
            <ClientChat
              clientId={client.id}
              telegramId={client.telegram_id}
              clientName={client.full_name}
            />
          </TabsContent>
        </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientCardConfigurable;

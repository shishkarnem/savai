import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  User, Phone, MapPin, Calendar, Briefcase, 
  DollarSign, MessageSquare, Bot, ExternalLink 
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { CardSection } from '@/hooks/useCRMSettings';
import { SettingsConstructor } from './SettingsConstructor';

type Client = Tables<'clients'>;

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
  if (!client) return null;

  const isSectionVisible = (key: string) => 
    cardSections.find(s => s.key === key)?.visible ?? true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">
                {client.full_name || 'Без имени'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={getStatusColor(client.status)}>
                  {client.status || 'Нет статуса'}
                </Badge>
                {client.project_code && (
                  <Badge variant="secondary" className="font-mono">
                    {client.project_code}
                  </Badge>
                )}
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

        <ScrollArea className="max-h-[60vh]">
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
      </DialogContent>
    </Dialog>
  );
};

export default ClientCardConfigurable;

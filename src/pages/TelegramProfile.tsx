import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Rivets from '@/components/Rivets';
import { 
  Users, MapPin, Briefcase, DollarSign, Calendar, 
  MessageSquare, Bot, ExternalLink, Copy, Check, Loader2, History, Calculator, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

interface UserCalculation {
  id: string;
  calculation_type: string;
  data: Record<string, any>;
  created_at: string;
}

type Client = Tables<'clients'>;
type TelegramProfileType = Tables<'telegram_profiles'>;

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
      {icon && <span className="text-primary/60 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground/50">{label}</div>
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

const TelegramProfile: React.FC = () => {
  const navigate = useNavigate();
  const { telegramId: paramTelegramId } = useParams<{ telegramId: string }>();
  const { telegramUser, profile, isLoading: authLoading, isTelegramWebApp } = useTelegramAuth();
  const { hasAccess: hasCRMAccess, accessLevel } = useCRMAccess();
  const [copied, setCopied] = React.useState(false);

  // Determine which telegram ID to use
  const isPublicProfile = !!paramTelegramId;
  const targetTelegramId = paramTelegramId || profile?.telegram_id?.toString();

  // Fetch user calculations history
  const { data: calculations } = useQuery({
    queryKey: ['user-calculations', targetTelegramId],
    queryFn: async () => {
      if (!targetTelegramId) return [];
      const telegramIdNum = parseInt(targetTelegramId, 10);
      if (isNaN(telegramIdNum)) return [];
      
      const { data, error } = await supabase
        .from('user_calculations')
        .select('*')
        .eq('telegram_id', telegramIdNum)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching calculations:', error);
        return [];
      }
      return data as UserCalculation[];
    },
    enabled: !!targetTelegramId,
  });

  const calculatorHistory = calculations?.filter(c => c.calculation_type === 'calculator') || [];
  const aiSellerHistory = calculations?.filter(c => c.calculation_type === 'ai_seller') || [];

  // Fetch client data from CRM
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client-profile', targetTelegramId],
    queryFn: async () => {
      if (!targetTelegramId) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('telegram_id', targetTelegramId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching client:', error);
        return null;
      }
      return data as Client | null;
    },
    enabled: !!targetTelegramId,
  });

  // Fetch telegram profile for public profiles
  const { data: publicProfile, isLoading: publicProfileLoading } = useQuery({
    queryKey: ['public-telegram-profile', targetTelegramId],
    queryFn: async () => {
      if (!targetTelegramId) return null;
      
      const telegramIdNum = parseInt(targetTelegramId, 10);
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
      return data as TelegramProfileType | null;
    },
    enabled: isPublicProfile && !!targetTelegramId,
  });

  const isLoading = authLoading || clientLoading || (isPublicProfile && publicProfileLoading);

  // Use public profile data or auth context profile
  const displayProfile = isPublicProfile ? publicProfile : profile;

  const copyProfileLink = () => {
    const link = `${window.location.origin}/profile/${targetTelegramId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="glass-panel p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg">Загрузка профиля...</p>
        </motion.div>
      </div>
    );
  }

  // For non-public profiles, require Telegram WebApp
  if (!isPublicProfile && (!isTelegramWebApp || !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="glass-panel p-8 text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Rivets />
          <i className="fa-brands fa-telegram text-6xl text-primary mb-6"></i>
          <h2 className="text-2xl font-bold mb-4 text-primary">Telegram не обнаружен</h2>
          <p className="text-foreground/70 mb-6">
            Для просмотра профиля откройте приложение через Telegram бота.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="steam-button"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Вернуться на главную
          </Button>
        </motion.div>
      </div>
    );
  }

  // For public profiles without data
  if (isPublicProfile && !displayProfile && !clientData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="glass-panel p-8 text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Rivets />
          <i className="fa-solid fa-user-slash text-6xl text-primary/50 mb-6"></i>
          <h2 className="text-2xl font-bold mb-4 text-primary">Профиль не найден</h2>
          <p className="text-foreground/70 mb-6">
            Пользователь с ID {paramTelegramId} не зарегистрирован в системе.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="steam-button"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Вернуться на главную
          </Button>
        </motion.div>
      </div>
    );
  }

  const fullName = clientData?.full_name || 
    (displayProfile ? [displayProfile.first_name, displayProfile.last_name].filter(Boolean).join(' ') : null) || 
    'Безымянный инженер';
  
  const registrationDate = displayProfile?.created_at 
    ? new Date(displayProfile.created_at).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  const photoUrl = displayProfile?.photo_url;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 flex justify-between items-center">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="text-foreground/60 hover:text-primary"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i>
          Назад
        </Button>
        
        {targetTelegramId && (
          <Button
            onClick={copyProfileLink}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Скопировано!' : 'Скопировать ссылку'}
          </Button>
        )}
      </header>

      {/* Profile Card */}
      <motion.div
        className="glass-panel p-8 max-w-2xl w-full relative overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Rivets />
        
        {/* Decorative gears */}
        <div className="absolute -top-4 -right-4 opacity-10">
          <i className="fa-solid fa-gear text-6xl text-primary animate-spin" style={{ animationDuration: '20s' }}></i>
        </div>

        {/* Profile Photo */}
        <div className="flex justify-center mb-6">
          <motion.div
            className="relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="w-32 h-32 rounded-full border-4 border-primary/50 overflow-hidden bg-black/40 backdrop-blur-md shadow-lg shadow-primary/20">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="fa-solid fa-user-gear text-5xl text-primary/60"></i>
                </div>
              )}
            </div>
            {/* Telegram badge */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0088cc] rounded-full flex items-center justify-center border-2 border-background shadow-lg">
              <i className="fa-brands fa-telegram text-white text-xl"></i>
            </div>
          </motion.div>
        </div>

        {/* Name */}
        <motion.h1
          className="text-2xl md:text-3xl font-bold text-center text-primary mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {fullName}
        </motion.h1>

        {/* Username */}
        {displayProfile?.username && (
          <motion.p
            className="text-center text-foreground/60 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            @{displayProfile.username}
          </motion.p>
        )}

        {/* Status badge */}
        {clientData?.status && (
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <Badge variant="outline" className={getStatusColor(clientData.status)}>
              {clientData.status}
            </Badge>
          </motion.div>
        )}

        {/* Divider */}
        <div className="border-t border-foreground/10 my-6"></div>

        {/* Scrollable content for CRM data */}
        <ScrollArea className="max-h-[400px]">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* Basic Info */}
            <Section title="Основная информация">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <InfoRow 
                  label="ID Telegram" 
                  value={targetTelegramId} 
                  icon={<i className="fa-solid fa-fingerprint text-sm"></i>} 
                />
                {registrationDate && (
                  <InfoRow 
                    label="Дата регистрации" 
                    value={registrationDate} 
                    icon={<Calendar className="h-4 w-4" />} 
                  />
                )}
                <InfoRow 
                  label="Город" 
                  value={clientData?.city} 
                  icon={<MapPin className="h-4 w-4" />} 
                />
                <InfoRow 
                  label="Telegram" 
                  value={clientData?.telegram_client} 
                  icon={<MessageSquare className="h-4 w-4" />} 
                />
              </div>
            </Section>

            {/* Project Info */}
            {clientData?.project && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Проект">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow 
                      label="Название проекта" 
                      value={clientData.project} 
                      icon={<Briefcase className="h-4 w-4" />} 
                    />
                    <InfoRow label="Код проекта" value={clientData.project_code} />
                    <InfoRow label="Продукт" value={clientData.product} />
                    <InfoRow label="Подразделение" value={clientData.department} />
                    <InfoRow label="Сотрудников" value={clientData.employees_count} />
                    <InfoRow label="Функционал" value={clientData.functionality} />
                  </div>
                </Section>
              </>
            )}

            {/* Expert & Tariff */}
            {(clientData?.expert_name || clientData?.tariff) && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Эксперт и тариф">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow label="Эксперт" value={clientData.expert_pseudonym || clientData.expert_name} />
                    <InfoRow label="Тариф" value={clientData.tariff} />
                    <InfoRow label="Выбранный эксперт" value={clientData.selected_expert} />
                  </div>
                </Section>
              </>
            )}

            {/* Finance */}
            {clientData?.sav_cost && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Финансы">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow 
                      label="Стоимость SAV" 
                      value={clientData.sav_cost} 
                      icon={<DollarSign className="h-4 w-4" />} 
                    />
                    <InfoRow label="Окупаемость" value={clientData.payback} />
                    <InfoRow label="Обслуживание" value={clientData.service_price} />
                  </div>
                </Section>
              </>
            )}

            {/* Dates */}
            {(clientData?.calculator_date || clientData?.start_date) && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Важные даты">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow 
                      label="Дата калькулятора" 
                      value={clientData.calculator_date} 
                      icon={<Calendar className="h-4 w-4" />} 
                    />
                    <InfoRow label="Дата старта" value={clientData.start_date} />
                    <InfoRow label="Дата эксперта" value={clientData.expert_date} />
                    <InfoRow label="Дата оплаты" value={clientData.payment_date} />
                  </div>
                </Section>
              </>
            )}

            {/* Bot Info */}
            {clientData?.protalk_id && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Telegram бот">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow 
                      label="ProTalk ID" 
                      value={clientData.protalk_id} 
                      icon={<Bot className="h-4 w-4" />} 
                    />
                    <InfoRow label="Статус отправки" value={clientData.protalk_send_status} />
                    <InfoRow label="Канал" value={clientData.channel} />
                  </div>
                </Section>
              </>
            )}

            {/* Documents */}
            {(clientData?.contract_ooo_url || clientData?.contract_ip_url || clientData?.project_plan_url) && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Документы">
                  <div className="space-y-2">
                    {clientData.contract_ooo_url && (
                      <a 
                        href={clientData.contract_ooo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Договор ООО
                      </a>
                    )}
                    {clientData.contract_ip_url && (
                      <a 
                        href={clientData.contract_ip_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Договор ИП
                      </a>
                    )}
                    {clientData.project_plan_url && (
                      <a 
                        href={clientData.project_plan_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        План проекта
                      </a>
                    )}
                  </div>
                </Section>
              </>
            )}

            {/* Comment */}
            {clientData?.comment && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Комментарий">
                  <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                    {clientData.comment}
                  </p>
                </Section>
              </>
            )}
          </motion.div>
        </ScrollArea>

        {/* CRM Access Button - Only for admins */}
        {hasCRMAccess && !isPublicProfile && (
          <motion.div
            className="mt-6 pt-6 border-t border-foreground/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              onClick={() => navigate('/admin/crm')}
              className="w-full gap-2 bg-primary/20 hover:bg-primary/30 border border-primary/40"
              variant="outline"
            >
              <Users className="w-4 h-4" />
              Войти в CRM
              {accessLevel === 'admin' && (
                <span className="ml-2 text-xs bg-primary/30 px-2 py-0.5 rounded">Admin</span>
              )}
            </Button>
          </motion.div>
        )}

        {/* Quick Actions */}
        {!isPublicProfile && (
          <motion.div
            className="mt-6 pt-6 border-t border-foreground/10 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-sm font-semibold text-primary mb-3">Быстрые действия</h3>
            
            <Button
              onClick={() => navigate('/experts/history')}
              variant="outline"
              className="w-full gap-2 justify-start"
            >
              <History className="w-4 h-4" />
              История свайпов экспертов
            </Button>

            {calculatorHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-foreground/50">История калькулятора ({calculatorHistory.length})</p>
                {calculatorHistory.slice(0, 3).map(calc => (
                  <Button
                    key={calc.id}
                    variant="ghost"
                    className="w-full gap-2 justify-start text-sm h-auto py-2"
                    onClick={() => {
                      sessionStorage.setItem('sav-calculator-data', JSON.stringify(calc.data));
                      navigate('/calculator');
                    }}
                  >
                    <Calculator className="w-4 h-4 text-primary" />
                    <span className="truncate">{calc.data?.company || calc.data?.product || 'Расчет'}</span>
                    <span className="ml-auto text-xs text-foreground/40">
                      {new Date(calc.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </Button>
                ))}
              </div>
            )}

            {aiSellerHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-foreground/50">История ИИ-продавца ({aiSellerHistory.length})</p>
                {aiSellerHistory.slice(0, 3).map(calc => (
                  <Button
                    key={calc.id}
                    variant="ghost"
                    className="w-full gap-2 justify-start text-sm h-auto py-2"
                    onClick={() => {
                      if (calc.data?.businessType) sessionStorage.setItem('sav-business-type', calc.data.businessType);
                      if (calc.data?.selectedPlan) sessionStorage.setItem('sav-selected-plan', calc.data.selectedPlan);
                      navigate('/ai-seller/plans');
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="truncate">{calc.data?.businessType || calc.data?.selectedPlan || 'Анализ'}</span>
                    <span className="ml-auto text-xs text-foreground/40">
                      {new Date(calc.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Footer */}
      <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
        © 1885-2026 SAV AI • Королевская Академия Робототехники
      </footer>
    </div>
  );
};

export default TelegramProfile;

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlanData, PlanLevel } from '@/types';
import { FALLBACK_PLANS } from '@/constants';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Repeat, Zap, Check, Info, Cog, Wallet, ChevronLeft, HelpCircle } from 'lucide-react';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AITariffAdvisor from '@/components/AITariffAdvisor';
import { useActionTracker } from '@/hooks/useActionTracker';

type PaymentType = 'monthly' | 'onetime';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const AISellerPlans: React.FC = () => {
  const navigate = useNavigate();
  const { profile: telegramProfile } = useTelegramAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanLevel | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [showTariffAdvisor, setShowTariffAdvisor] = useState(false);
  const { trackAction } = useActionTracker('ai_seller');
  const viewNotifiedRef = useRef(false);

  // Helper to get business info from sessionStorage
  const getBusinessInfo = () => {
    const stored = sessionStorage.getItem('sav-business-info');
    const businessDescription = sessionStorage.getItem('sav-business-description');
    if (!stored) return { type: null, classification: null, businessDescription: businessDescription || null };
    try {
      const info = JSON.parse(stored);
      return {
        type: `${info.segment} / ${info.category} / ${info.sphere}`,
        classification: info.description || null,
        businessDescription: businessDescription || info.description || null,
      };
    } catch { return { type: null, classification: null, businessDescription: businessDescription || null }; }
  };

  const sendNotification = async (
    action: string, 
    payType: string = 'view',
    extra?: { selectedTariff?: string; tariffPrice?: string; tariffDescription?: string; paymentModel?: string; currentStep?: string }
  ) => {
    try {
      await supabase.functions.invoke('sav-notify-tariff-selection', {
        body: {
          tariffName: action,
          paymentType: payType,
          clientInfo: {
            telegramId: telegramProfile?.telegram_id ? String(telegramProfile.telegram_id) : null,
            telegramUsername: telegramProfile?.username || null,
            fullName: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || null,
            firstName: telegramProfile?.first_name || null,
            lastName: telegramProfile?.last_name || null,
          },
          businessInfo: getBusinessInfo(),
          currentStep: extra?.currentStep || action,
          selectedTariff: extra?.selectedTariff || null,
          tariffPrice: extra?.tariffPrice || null,
          tariffDescription: extra?.tariffDescription || null,
          paymentModel: extra?.paymentModel || null,
        },
      });
    } catch (err) {
      console.error('Notification error:', err);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('sav-plans');
    if (stored) {
      setPlans(JSON.parse(stored));
    }
  }, []);

  // Track page visit and send notification when plans are first shown
  useEffect(() => {
    trackAction('view_plans', { page: '/ai-seller/plans' });
    
    // Send notification about plan view (only once per session)
    if (!viewNotifiedRef.current && telegramProfile) {
      viewNotifiedRef.current = true;
      sendNotification('Просмотр тарифов', 'view', { currentStep: 'Просмотр тарифов' });
    }
  }, [telegramProfile]);

  const displayPlans = plans.length > 0 ? plans : FALLBACK_PLANS;
  const selectedPlanData = displayPlans.find(p => p.package === selectedPlan);

  const handlePlanClick = (plan: PlanLevel) => {
    setSelectedPlan(plan);
    setPaymentType(null);
    trackAction('select_plan', { page: '/ai-seller/plans', value: plan });
    
    const planData = displayPlans.find(p => p.package === plan);
    sendNotification(`Изучить чертеж: ${plan}`, 'view', {
      currentStep: 'Изучить чертеж',
      selectedTariff: plan,
      tariffPrice: planData?.priceMonth ? `${planData.priceMonth.toLocaleString()} ₽/мес` : 'По запросу',
      tariffDescription: planData?.fullDescription || null,
    });
  };

  const handlePaymentSelect = (type: PaymentType) => {
    setPaymentType(type);
  };

  const handleConfirm = async () => {
    if (selectedPlan && paymentType) {
      sessionStorage.setItem('sav-selected-plan', selectedPlan);
      sessionStorage.setItem('sav-payment-type', paymentType);

      const payLabel = paymentType === 'monthly' ? 'Ежемесячный' : 'Единоразовый';
      const price = selectedPlanData?.priceMonth 
        ? (paymentType === 'onetime' 
          ? `${(selectedPlanData.priceMonth * 6).toLocaleString()} ₽` 
          : `${selectedPlanData.priceMonth.toLocaleString()} ₽/мес`)
        : 'По запросу';
      
      await sendNotification(`Изучить чертеж: ${selectedPlan} (${payLabel})`, paymentType, {
        currentStep: 'Выбор модели оплаты',
        selectedTariff: selectedPlan,
        tariffPrice: price,
        tariffDescription: selectedPlanData?.fullDescription || null,
        paymentModel: payLabel,
      });

      navigate(`/ai-seller/plan/${encodeURIComponent(selectedPlan)}`);
    }
  };

  const handleBack = () => {
    if (paymentType) {
      setPaymentType(null);
    } else if (selectedPlan) {
      setSelectedPlan(null);
    } else {
      navigate('/ai-seller/result');
    }
  };

  const getPrice = (basePrice: number | undefined, type: PaymentType) => {
    if (!basePrice) return 'По запросу';
    if (type === 'onetime') {
      return `${(basePrice * 6).toLocaleString()} ₽`;
    }
    return `${basePrice.toLocaleString()} ₽/мес`;
  };

  // If a plan is selected, show payment type selection
  if (selectedPlan && selectedPlanData) {
    return (
      <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
        <Header onLogoClick={() => navigate('/')} />
        <main className="w-full max-w-4xl flex-grow">
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.35 }}
            className="w-full"
          >
            <div className="steam-fade space-y-5">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={handleBack}
                  className="p-2 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-primary" />
                </button>
                <h2 className="text-2xl md:text-4xl text-primary">{selectedPlan}</h2>
              </div>

              {/* Full Plan Description */}
              <div className="steampunk-border p-4 md:p-6 relative mb-6">
                <Rivets />
                <h3 className="text-lg font-bold text-primary mb-4 border-b border-primary/20 pb-2">
                  📋 Полное описание чертежа
                </h3>
                <div className="text-sm whitespace-pre-wrap leading-relaxed opacity-80">
                  {selectedPlanData.fullDescription || 'Описание недоступно'}
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="steampunk-border p-4 md:p-6 relative">
                <Rivets />
                <h3 className="text-lg font-bold text-primary mb-4 border-b border-primary/20 pb-2">
                  ⚙️ Выберите модель оплаты
                </h3>
                
                <div className="grid gap-4 mb-6">
                  {/* Monthly Payment Option */}
                  <button
                    onClick={() => handlePaymentSelect('monthly')}
                    className={`relative p-5 rounded-lg border text-left transition-all overflow-hidden ${
                      paymentType === 'monthly'
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-primary/20 bg-background/30 hover:border-primary/50'
                    }`}
                  >
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <Cog className="w-20 h-20 text-primary animate-spin" style={{ animationDuration: '20s' }} />
                    </div>
                    
                    <div className="flex items-start gap-4 relative z-10">
                      <div className={`p-3 rounded-lg ${paymentType === 'monthly' ? 'bg-primary/20' : 'bg-primary/10'}`}>
                        <Repeat className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg mb-1">⚙️ Ежемесячный Тариф</div>
                        <div className="text-sm text-muted-foreground mb-3">
                          Оплата раз в месяц. Стандартная модель подписки с полным обслуживанием.
                        </div>
                        
                        <div className="p-3 rounded border border-primary/20 bg-background/50 space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500" />
                            <span>Токены включены в тариф</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500" />
                            <span>Можно отменить в любой момент</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500" />
                            <span>Бесплатные обновления бота</span>
                          </div>
                          <div className="flex items-center gap-2 text-primary font-medium mt-2 pt-2 border-t border-primary/20">
                            <Wallet className="w-3 h-3" />
                            <span>Стоимость: {getPrice(selectedPlanData.priceMonth, 'monthly')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* One-time Payment Option */}
                  <button
                    onClick={() => handlePaymentSelect('onetime')}
                    className={`relative p-5 rounded-lg border text-left transition-all overflow-hidden ${
                      paymentType === 'onetime'
                        ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
                        : 'border-primary/20 bg-background/30 hover:border-accent/50'
                    }`}
                  >
                    <div className="absolute -right-2 -top-2 opacity-10">
                      <Zap className="w-16 h-16 text-accent" />
                    </div>
                    
                    <div className="flex items-start gap-4 relative z-10">
                      <div className={`p-3 rounded-lg ${paymentType === 'onetime' ? 'bg-accent/20' : 'bg-accent/10'}`}>
                        <Zap className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg mb-1">⚡ Единоразовая Разработка</div>
                        <div className="text-sm text-muted-foreground mb-3">
                          Оплата 50/50 за полную разработку. Бот становится вашей собственностью навсегда.
                        </div>
                        
                        <div className="p-3 rounded border border-accent/30 bg-background/50 space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500" />
                            <span>Полное владение ботом</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500" />
                            <span>Нет ежемесячных платежей</span>
                          </div>
                          <div className="flex items-center gap-2 text-accent">
                            <Info className="w-3 h-3" />
                            <span>Токены оплачиваются самостоятельно</span>
                          </div>
                          <div className="flex items-center gap-2 text-primary font-medium mt-2 pt-2 border-t border-primary/20">
                            <Wallet className="w-3 h-3" />
                            <span>Стоимость: {getPrice(selectedPlanData.priceMonth, 'onetime')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                <AnimatePresence>
                  {paymentType && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-lg border border-primary/30 bg-gradient-to-br from-background/80 to-primary/5 mb-4"
                    >
                      <button
                        onClick={handleConfirm}
                        className="steampunk-button w-full py-3 text-sm"
                      >
                        Изучить чертеж
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                <button 
                  onClick={() => navigate('/experts')}
                  className="steampunk-button px-6 md:px-10 py-3.5 text-base md:text-lg"
                >
                  <i className="fa-solid fa-user-gear"></i> Аудит Экспертом
                </button>
                <button 
                  onClick={() => navigate('/calculator')}
                  className="border border-foreground/10 text-primary px-6 md:px-10 py-3.5 text-base md:text-lg hover:bg-foreground/5 transition-all rounded-xl backdrop-blur-md"
                >
                  Точный расчет
                </button>
              </div>
            </div>
          </motion.div>
        </main>
        <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
          © 1885-2026 SAV AI • Королевская Академия Робототехники
        </footer>
      </div>
    );
  }

  // Default: show plan cards
  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      <Header onLogoClick={() => navigate('/')} />
      <AITariffAdvisor isOpen={showTariffAdvisor} onClose={() => setShowTariffAdvisor(false)} plans={displayPlans} />
      <main className="w-full max-w-4xl flex-grow">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.35 }}
          className="w-full"
        >
          <div className="steam-fade space-y-5">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={handleBack}
                className="p-2 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-primary" />
              </button>
              <h2 className="text-3xl md:text-5xl text-primary">Каталог Решений</h2>
              <button
                onClick={() => setShowTariffAdvisor(true)}
                className="ml-auto p-2 rounded-lg border border-accent/30 bg-accent/10 hover:bg-accent/20 transition-colors"
                title="Какой тариф мне подходит?"
              >
                <HelpCircle className="w-5 h-5 text-accent" />
              </button>
            </div>
            
            <button
              onClick={() => setShowTariffAdvisor(true)}
              className="w-full py-3 px-4 bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 rounded-xl text-accent hover:from-accent/30 hover:to-primary/30 transition-all flex items-center justify-center gap-2 mb-4"
            >
              <HelpCircle className="w-5 h-5" />
              Какой тариф мне подходит?
            </button>
            
            <div className="bg-foreground/5 backdrop-blur-xl p-3.5 border-l-2 border-primary rounded-r-xl mb-6 italic text-[11px] md:text-sm">
              <p className="opacity-70">Выберите конфигурацию, наиболее пригодную для вашей мануфактуры.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {displayPlans.map((p, idx) => (
                <div 
                  key={idx} 
                  className="steampunk-border p-5 flex flex-col h-full hover:scale-[1.03] transition-transform cursor-pointer group"
                  onClick={() => handlePlanClick(p.package as PlanLevel)}
                >
                  <Rivets />
                  <div className="text-xl md:text-2xl text-primary mb-3 border-b border-foreground/5 pb-2 font-bold">
                    {p.package}
                  </div>
                  <div className="text-[11px] md:text-xs opacity-60 mb-5 flex-1 whitespace-pre-wrap leading-relaxed">
                    {p.fullDescription}
                  </div>
                  <div className="text-xl md:text-3xl font-bold mb-5 text-center text-primary drop-shadow-lg">
                    {p.priceMonth ? `${p.priceMonth.toLocaleString()} ₽` : 'По запросу'}
                  </div>
                  <button className="steampunk-button w-full py-2.5 text-xs">Изучить чертеж</button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button 
                onClick={() => navigate('/experts')}
                className="steampunk-button px-6 md:px-10 py-3.5 text-base md:text-lg"
              >
                <i className="fa-solid fa-user-gear"></i> Аудит Экспертом
              </button>
              <button 
                onClick={() => navigate('/calculator')}
                className="border border-foreground/10 text-primary px-6 md:px-10 py-3.5 text-base md:text-lg hover:bg-foreground/5 transition-all rounded-xl backdrop-blur-md"
              >
                Точный расчет
              </button>
            </div>
          </div>
        </motion.div>
      </main>
      <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
        © 1885-2026 SAV AI • Королевская Академия Робототехники
      </footer>
    </div>
  );
};

export default AISellerPlans;
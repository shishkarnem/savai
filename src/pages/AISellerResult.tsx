import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchPlansFromSheet } from '@/services/sheetService';
import { BusinessInfo } from '@/types';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import ProcessingLoader from '@/components/ProcessingLoader';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { supabase } from '@/integrations/supabase/client';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const AISellerResult: React.FC = () => {
  const navigate = useNavigate();
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { trackAction, saveSessionData } = useActionTracker('ai_seller');
  const { profile: telegramProfile } = useTelegramAuth();
  const classifyNotifiedRef = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('sav-business-info');
    if (stored) {
      const info = JSON.parse(stored);
      setBusinessInfo(info);
      trackAction('view_classification', { 
        page: '/ai-seller/result', 
        value: `${info.segment} / ${info.category} / ${info.sphere}` 
      });
    } else {
      navigate('/ai-seller');
    }
  }, [navigate]);

  const sendNotification = async (action: string) => {
    const businessDescription = sessionStorage.getItem('sav-business-description') || '';
    const stored = sessionStorage.getItem('sav-business-info');
    let bizType = null;
    let classification = null;
    if (stored) {
      try {
        const info = JSON.parse(stored);
        bizType = `${info.segment} / ${info.category} / ${info.sphere}`;
        classification = info.description || null;
      } catch {}
    }

    try {
      await supabase.functions.invoke('notify-tariff-selection', {
        body: {
          tariffName: action,
          paymentType: 'view',
          clientInfo: {
            telegramId: telegramProfile?.telegram_id ? String(telegramProfile.telegram_id) : null,
            telegramUsername: telegramProfile?.username || null,
            fullName: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || null,
          },
          businessInfo: {
            type: bizType,
            classification,
            businessDescription,
          },
        },
      });
    } catch (err) {
      console.error('Notification error:', err);
    }
  };

  const handleShowPrices = async () => {
    if (!businessInfo) return;
    setIsLoading(true);
    trackAction('show_prices', { page: '/ai-seller/result' });
    
    // Send notification about showing tariffs
    sendNotification('Показать тарифы');
    
    try {
      const sheetPlans = await fetchPlansFromSheet({
        sphere: businessInfo.sphere,
        segment: businessInfo.segment,
        category: businessInfo.category
      });
      sessionStorage.setItem('sav-plans', JSON.stringify(sheetPlans));
      await saveSessionData({
        segment: businessInfo.segment,
        category: businessInfo.category,
        sphere: businessInfo.sphere,
        description: businessInfo.description,
        step: 'plans_loaded',
      } as any);
      navigate('/ai-seller/plans');
    } catch {
      navigate('/ai-seller/plans');
    } finally {
      setIsLoading(false);
    }
  };

  if (!businessInfo) {
    return <ProcessingLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      {isLoading && <ProcessingLoader />}
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
            <div className="steampunk-border p-5 md:p-10 relative overflow-hidden">
              <Rivets />
              <div className="absolute top-0 right-0 p-2.5 bg-primary/70 text-background font-bold text-[9px] md:text-[10px] rounded-bl-xl uppercase tracking-tighter">
                АРХИВ №2025
              </div>
              
              <div className="mb-6 text-foreground italic leading-relaxed text-xs md:text-base border-l-2 border-primary pl-4 md:pl-6 bg-foreground/5 py-4 rounded-r-xl">
                {businessInfo.praise}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-4 mb-6">
                {['Секция', 'Категория', 'Отрасль'].map((label, i) => {
                  const vals = [businessInfo.segment, businessInfo.category, businessInfo.sphere];
                  return (
                    <div key={i} className="p-2.5 md:p-4 bg-foreground/5 border border-foreground/5 rounded-xl text-center backdrop-blur-lg">
                      <div className="text-[9px] md:text-[10px] text-primary uppercase mb-1 opacity-50">{label}</div>
                      <div className="text-sm md:text-xl font-bold">{vals[i]}</div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 md:p-6 bg-foreground/5 border border-dashed border-primary/20 rounded-2xl text-center mb-6">
                <h3 className="text-lg md:text-2xl mb-1.5 text-primary">
                  Индивидуальное решение: {businessInfo.package || 'SAV AI'}
                </h3>
                <p className="text-[10px] md:text-xs italic opacity-50">Механизмы классифицированы. Начинаем расчет цен?</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handleShowPrices}
                  className="steampunk-button flex-1 py-3.5 text-base md:text-xl"
                >
                  <i className="fa-solid fa-scroll"></i> Показать тарифы
                </button>
                <button 
                  onClick={() => navigate('/ai-seller')}
                  className="border border-foreground/10 text-primary hover:bg-foreground/5 py-3 px-6 transition-all text-[11px] md:text-sm uppercase font-bold rounded-xl backdrop-blur-md"
                >
                  Скорректировать
                </button>
              </div>
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

export default AISellerResult;
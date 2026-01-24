import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlanData, PlanLevel, BusinessInfo } from '@/types';
import { FALLBACK_PLANS, INTEGRATIONS_LIST } from '@/constants';
import { fetchSpecificPlan } from '@/services/sheetService';
import { generatePlanPresentation } from '@/services/geminiService';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import ProcessingLoader from '@/components/ProcessingLoader';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const AISellerPlanDetails: React.FC = () => {
  const navigate = useNavigate();
  const { planLevel } = useParams<{ planLevel: string }>();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [presentation, setPresentation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlanDetails = async () => {
      if (!planLevel) {
        navigate('/ai-seller/plans');
        return;
      }

      const decodedPlan = decodeURIComponent(planLevel) as PlanLevel;
      const storedBusinessInfo = sessionStorage.getItem('sav-business-info');
      const paymentType = sessionStorage.getItem('sav-payment-type') as 'monthly' | 'onetime';
      
      try {
        let businessInfo: BusinessInfo | null = null;
        if (storedBusinessInfo) {
          businessInfo = JSON.parse(storedBusinessInfo);
        }

        // Fetch plan data
        let data: PlanData | null = null;
        if (businessInfo) {
          const fetchedData = await fetchSpecificPlan({
            sphere: businessInfo.sphere,
            segment: businessInfo.segment,
            category: businessInfo.category,
            package: decodedPlan
          });
          data = fetchedData;
        }
        
        if (!data) {
          const fallback = FALLBACK_PLANS.find(p => p.package === decodedPlan);
          if (fallback) {
            data = {
              tariffName: fallback.package || '',
              package: fallback.package as PlanLevel,
              sphere: 'Другое' as any,
              segment: 'B2B' as any,
              category: 'Услуги' as any,
              fullDescription: fallback.fullDescription || '',
              priceMonth: fallback.priceMonth || 0,
              photoUrl: fallback.photoUrl || ''
            } as PlanData;
          }
        }

        // Apply payment type multiplier
        if (data && paymentType === 'onetime' && data.priceMonth) {
          setPlanData({ ...data, priceMonth: data.priceMonth * 6 });
        } else {
          setPlanData(data);
        }

        // Generate presentation
        if (businessInfo) {
          const pres = await generatePlanPresentation(businessInfo, decodedPlan);
          setPresentation(pres);
        }
      } catch (err) {
        console.error('Error loading plan details:', err);
        const fallback = FALLBACK_PLANS.find(p => p.package === decodedPlan);
        if (fallback) {
          setPlanData({
            tariffName: fallback.package || '',
            package: fallback.package as PlanLevel,
            sphere: 'Другое' as any,
            segment: 'B2B' as any,
            category: 'Услуги' as any,
            fullDescription: fallback.fullDescription || '',
            priceMonth: fallback.priceMonth || 0,
            photoUrl: fallback.photoUrl || ''
          } as PlanData);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPlanDetails();
  }, [planLevel, navigate]);

  if (isLoading) {
    return <ProcessingLoader />;
  }

  if (!planData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">План не найден</p>
          <button onClick={() => navigate('/ai-seller/plans')} className="steampunk-button">
            К списку тарифов
          </button>
        </div>
      </div>
    );
  }

  const selectedPlan = decodeURIComponent(planLevel || '') as PlanLevel;

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
          <div className="steam-fade space-y-5 pb-10">
            <div className="steampunk-border p-5 md:p-10">
              <Rivets />
              <div className="flex justify-between items-center mb-6 border-b border-foreground/10 pb-4">
                <h2 className="text-2xl md:text-5xl text-primary">{selectedPlan}</h2>
                <button 
                  onClick={() => navigate('/ai-seller/plans')} 
                  className="text-primary underline text-xs md:text-base opacity-60 hover:opacity-100 transition-opacity"
                >
                  К списку
                </button>
              </div>

              <div className="mb-8">
                <h3 className="text-lg md:text-xl mb-3 opacity-90 text-primary">Спецификация Механизма:</h3>
                {planData.photoUrl && (
                  <img 
                    src={planData.photoUrl} 
                    alt="Plan" 
                    className="w-full h-40 md:h-80 object-cover rounded-2xl border border-foreground/10 mb-6 grayscale brightness-90 hover:grayscale-0 transition-all duration-700 shadow-2xl" 
                  />
                )}
                <div className="bg-foreground/5 p-4 md:p-6 border border-foreground/5 rounded-2xl whitespace-pre-wrap leading-relaxed text-xs md:text-base italic mb-6 backdrop-blur-2xl">
                  {planData.fullDescription}
                </div>
              </div>

              {presentation && (
                <div className="mb-8">
                  <h3 className="text-lg md:text-xl mb-3 opacity-90 text-primary">Демонстрация Возможностей:</h3>
                  <div className="bg-black/20 p-4 rounded-xl prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-[10px] md:text-sm opacity-70">
                    {presentation}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="p-4 md:p-6 bg-foreground/5 border border-foreground/5 rounded-2xl backdrop-blur-lg">
                  <h4 className="text-primary mb-3 uppercase font-bold text-[10px] md:text-xs opacity-70">Энергоблоки (Токены):</h4>
                  <ul className="space-y-1.5 text-[10px] md:text-xs opacity-60">
                    <li>⚙️ 10 млн. = 600 руб.</li>
                    <li>⚙️ 50 млн. = 3 000 руб.</li>
                    <li>⚙️ 200 млн. = 12 000 руб.</li>
                    <li>⚙️ 400 млн. = 24 000 руб.</li>
                  </ul>
                </div>
                <div className="p-4 md:p-6 bg-foreground/5 border border-foreground/5 rounded-2xl backdrop-blur-lg">
                  <h4 className="text-primary mb-3 uppercase font-bold text-[10px] md:text-xs opacity-70">Узлы Связи:</h4>
                  <div className="h-32 overflow-y-auto text-[9px] md:text-xs space-y-1 pr-2">
                    {INTEGRATIONS_LIST.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    // Save selected plan info for expert selection
                    sessionStorage.setItem('sav-selected-plan', selectedPlan);
                    navigate('/experts', { state: { fromAISeller: true, selectedPlan } });
                  }}
                  className="steampunk-button w-full py-4 text-lg md:text-2xl"
                >
                  Выбрать эксперта для аудита
                </button>
                <button 
                  onClick={() => navigate('/calculator')}
                  className="border border-foreground/10 text-primary w-full py-3 text-sm md:text-base hover:bg-foreground/5 transition-all rounded-xl backdrop-blur-md"
                >
                  Пересчитать на калькуляторе
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

export default AISellerPlanDetails;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BusinessInfo, PlanData, PlanLevel } from '../types';
import { classifyBusiness, generatePlanPresentation } from '../services/geminiService';
import { fetchPlansFromSheet, fetchSpecificPlan } from '../services/sheetService';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import Header from '../components/Header';
import IgnitionScreen from '../components/IgnitionScreen';
import BootLoader from '../components/BootLoader';
import ProcessingLoader from '../components/ProcessingLoader';
import IntroStep from '../components/IntroStep';
import ClassificationStep from '../components/ClassificationStep';
import PlansStep from '../components/PlansStep';
import PlanDetailsStep from '../components/PlanDetailsStep';
import CalculatorStep from '../components/CalculatorStep';
import ExpertStep from '../components/ExpertStep';
import TelegramRequiredModal from '../components/TelegramRequiredModal';
import DevModeToggle from '../components/DevModeToggle';
import { useModelCache } from '@/hooks/useModelCache';

type Step = 'ignition' | 'booting' | 'intro' | 'classification' | 'plans' | 'details' | 'expert' | 'calculator';

const DEFAULT_GLB_URL = "https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQLJ1MGPTJ2Vxs9JjAnEQc6LxgNYmgDFSJoJjMfDDsZOjs8BBsmCzQ_JHppBnY7ByAOExIjbGYqJTkmVVpuYlYEbAV1VAgQCjEWKxseGVMpKyRYNBcXUm4FNwJgOi4UAQ4SOS4tKzsGCyUuTwJgBHdVAGB-S3U.glb";

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const pageTransition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.35,
};

const Index: React.FC = () => {
  const [step, setStep] = useState<Step>('ignition');
  const [inputValue, setInputValue] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanLevel | null>(null);
  const [planDetails, setPlanDetails] = useState<{
    data: PlanData | null;
    presentation: string;
  } | null>(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const rotationRef = useRef(0);
  const lastXRef = useRef(0);

  // Model cache hook
  const {
    isModelCached,
    isModelLoaded,
    bootProgress,
    bootStatus,
    startBooting,
  } = useModelCache(DEFAULT_GLB_URL);

  // Telegram WebApp auth
  const { profile: telegramProfile, isLoading: isTelegramLoading, isTelegramWebApp, isNewUser } = useTelegramAuth();
  
  // Check if Telegram is required for protected actions
  const requiresTelegram = !isTelegramLoading && !isTelegramWebApp;
  
  // Handler for protected actions
  const handleProtectedAction = (action: () => void) => {
    if (requiresTelegram) {
      setShowTelegramModal(true);
    } else {
      action();
    }
  };
  
  // Log Telegram user info for debugging
  useEffect(() => {
    if (telegramProfile) {
      console.log('Telegram user registered:', {
        telegram_id: telegramProfile.telegram_id,
        name: `${telegramProfile.first_name || ''} ${telegramProfile.last_name || ''}`.trim(),
        username: telegramProfile.username,
        isNewUser
      });
    }
  }, [telegramProfile, isNewUser]);

  // Initial loading logic with cache support
  useEffect(() => {
    // Check if model is already loaded (container has 'active' class)
    const bgModelContainer = document.getElementById('bg-model-container');
    const isModelAlreadyLoaded = bgModelContainer?.classList.contains('active');
    
    if (isModelAlreadyLoaded) {
      // Model already loaded, skip directly to intro
      setStep('intro');
      return;
    }

    // If cached, start loading faster
    if (isModelCached) {
      setStep('booting');
      startBooting(DEFAULT_GLB_URL);
    } else {
      // Normal flow - wait a bit then start
      const timer = setTimeout(() => {
        setStep('booting');
        startBooting(DEFAULT_GLB_URL);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModelCached, startBooting]);

  // Handle model loaded state
  useEffect(() => {
    if (isModelLoaded && step === 'booting') {
      const timer = setTimeout(() => setStep('intro'), 800);
      return () => clearTimeout(timer);
    }
  }, [isModelLoaded, step]);

  // Mouse/touch rotation handler
  useEffect(() => {
    const handleStart = (e: MouseEvent | TouchEvent) => {
      lastXRef.current = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    };
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const deltaX = currentX - lastXRef.current;
      lastXRef.current = currentX;
      if (step !== 'ignition' && step !== 'booting') {
        rotationRef.current += deltaX * 0.4;
        const bgModel = document.querySelector('#bg-model') as any;
        if (bgModel) {
          bgModel.cameraOrbit = `${rotationRef.current}deg 75deg 105%`;
        }
      }
    };
    window.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    return () => {
      window.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [step]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      setStep('booting');
      startBooting(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClassify = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    try {
      const info = await classifyBusiness(inputValue);
      setBusinessInfo(info);
      setStep('classification');
    } catch (err) {
      console.error(err);
      alert('Ошибка давления пара! Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowPrices = async () => {
    if (!businessInfo) return;
    setIsLoading(true);
    try {
      const sheetPlans = await fetchPlansFromSheet({
        sphere: businessInfo.sphere,
        segment: businessInfo.segment,
        category: businessInfo.category
      });
      setPlans(sheetPlans);
      setStep('plans');
    } catch {
      setStep('plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (level: PlanLevel, paymentType: 'monthly' | 'onetime') => {
    if (!businessInfo) return;
    setIsLoading(true);
    setSelectedPlan(level);
    try {
      const data = await fetchSpecificPlan({
        sphere: businessInfo.sphere,
        segment: businessInfo.segment,
        category: businessInfo.category,
        package: level
      });
      if (data && paymentType === 'onetime' && data.priceMonth) {
        data.priceMonth = data.priceMonth * 6;
      }
      const presentation = await generatePlanPresentation(businessInfo, level);
      setPlanDetails({ data, presentation });
      setStep('details');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Render step content with animation
  const renderStepContent = () => {
    switch (step) {
      case 'intro':
        return (
          <IntroStep
            inputValue={inputValue}
            setInputValue={setInputValue}
            onClassify={() => handleProtectedAction(handleClassify)}
            onCalculator={() => handleProtectedAction(() => setStep('calculator'))}
          />
        );
      case 'classification':
        return businessInfo && (
          <ClassificationStep
            businessInfo={businessInfo}
            onShowPrices={handleShowPrices}
            onBack={() => setStep('intro')}
          />
        );
      case 'plans':
        return businessInfo && (
          <PlansStep
            plans={plans}
            onSelectPlan={handleSelectPlan}
            onExpert={() => setStep('expert')}
            onCalculator={() => setStep('calculator')}
          />
        );
      case 'details':
        return planDetails && businessInfo && selectedPlan && (
          <PlanDetailsStep
            selectedPlan={selectedPlan}
            planDetails={planDetails}
            businessInfo={businessInfo}
            onBack={() => setStep('plans')}
            onExpert={() => setStep('expert')}
            onCalculator={() => setStep('calculator')}
          />
        );
      case 'calculator':
        return (
          <CalculatorStep
            hasBusinessInfo={!!businessInfo}
            onBack={() => setStep(businessInfo ? 'plans' : 'intro')}
          />
        );
      case 'expert':
        return <ExpertStep onRestart={() => window.location.reload()} />;
      default:
        return null;
    }
  };

  if (step === 'ignition') return (
    <>
      <DevModeToggle />
      <TelegramRequiredModal isOpen={showTelegramModal} onClose={() => setShowTelegramModal(false)} />
      <IgnitionScreen
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        onFileUpload={handleFileUpload}
        onUrlLoad={() => {
          setStep('booting');
          startBooting(urlInput.trim());
        }}
      />
    </>
  );
  
  if (step === 'booting') return (
    <>
      <DevModeToggle />
      <TelegramRequiredModal isOpen={showTelegramModal} onClose={() => setShowTelegramModal(false)} />
      <BootLoader bootProgress={bootProgress} bootStatus={bootStatus} />
    </>
  );
  
  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      <DevModeToggle />
      <TelegramRequiredModal isOpen={showTelegramModal} onClose={() => setShowTelegramModal(false)} />
      {isLoading && <ProcessingLoader />}
      <Header onLogoClick={() => setStep('intro')} />
      <main className="w-full max-w-4xl flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="w-full"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
        © 1885-2026 SAV AI • Королевская Академия Робототехники
      </footer>
    </div>
  );
};

export default Index;

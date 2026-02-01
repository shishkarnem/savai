import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import Header from '../components/Header';
import BootLoader from '../components/BootLoader';
import IntroStep from '../components/IntroStep';
import TelegramRequiredModal from '../components/TelegramRequiredModal';
import DevModeToggle from '../components/DevModeToggle';
import { useModelCache } from '@/hooks/useModelCache';

type Step = 'booting' | 'intro';

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
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('booting');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const rotationRef = useRef(0);
  const lastXRef = useRef(0);

  // Model cache hook - for boot animation only
  const {
    isModelCached,
    isModelLoaded,
    bootProgress,
    bootStatus,
    startBooting,
  } = useModelCache();

  // Telegram WebApp auth
  const { profile: telegramProfile, isLoading: isTelegramLoading, isTelegramWebApp, isNewUser } = useTelegramAuth();
  
  // Check if Telegram is required for protected actions
  const requiresTelegram = !isTelegramLoading && !isTelegramWebApp;
  
  // Handler for protected actions - navigate to separate pages
  const handleProtectedNavigation = (path: string) => {
    if (requiresTelegram) {
      setShowTelegramModal(true);
    } else {
      navigate(path);
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

  // Initial loading logic
  useEffect(() => {
    // Check if model is already loaded (container has 'active' class)
    const bgModelContainer = document.getElementById('bg-model-container');
    const isModelAlreadyLoaded = bgModelContainer?.classList.contains('active');
    
    if (isModelAlreadyLoaded) {
      // Model already loaded, skip directly to intro
      setStep('intro');
      return;
    }

    // Start boot animation
    startBooting();
  }, [startBooting]);

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
      if (step !== 'booting') {
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
            <IntroStep
              onClassify={() => handleProtectedNavigation('/ai-seller')}
              onCalculator={() => handleProtectedNavigation('/calculator')}
            />
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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, ChevronDown, RotateCcw, History, HelpCircle, Sparkles, Heart, ThumbsDown, ArrowLeft, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';
import Rivets from '@/components/Rivets';
import { Expert, SwipeDirection } from '@/components/ExpertCard';
import { useSwipeFeedback } from '@/hooks/useSwipeFeedback';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useToast } from '@/hooks/use-toast';
import { getMessageConstructorSettings } from '@/pages/CRMMessageConstructor';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import { useViewedExperts } from '@/hooks/useViewedExperts';
import { Skeleton } from '@/components/ui/skeleton';

interface SwipeHistoryItem {
  expert: Expert;
  direction: SwipeDirection;
  timestamp: Date;
}

interface LocationState {
  updatedHistory?: SwipeHistoryItem[];
  fromAISeller?: boolean;
  selectedPlan?: string;
}

interface AISellerData {
  businessType?: string;
  classificationResult?: string;
  selectedPlan?: string;
  presentationText?: string;
}

interface CalculatorData {
  fullName?: string;
  company?: string;
  product?: string;
  city?: string;
  department?: string;
  employeeCount?: string;
  averageSalary?: string;
  functionality?: string;
  maintenance?: string;
}

const ExpertSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { profile: telegramProfile } = useTelegramAuth();
  const { toast } = useToast();

  const [allExperts, setAllExperts] = useState<Expert[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);
  const [selectedExperts, setSelectedExperts] = useState<Expert[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [swipeAnimation, setSwipeAnimation] = useState<SwipeDirection | null>(null);
  const [explosionIcons, setExplosionIcons] = useState<{ id: number; x: number; y: number; icon: string; type: 'icon' | 'smoke' | 'gear' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Viewed experts persistence
  const { markAsViewed, isViewed, clearViewed } = useViewedExperts();
  
  // Filter out already viewed experts
  const experts = useMemo(() => {
    return allExperts.filter(e => !isViewed(e.id));
  }, [allExperts, isViewed]);
  
  // Preload images for next 3 experts
  const imageUrls = useMemo(() => {
    return experts.slice(currentIndex, currentIndex + 3).map(e => e.photo_url);
  }, [experts, currentIndex]);
  
  const { isLoaded, isLoading } = useImagePreloader(imageUrls);
  
  // Detect if coming from AI Seller flow
  const fromAISeller = state?.fromAISeller || sessionStorage.getItem('sav-selected-plan');
  
  const { triggerFeedback } = useSwipeFeedback();

  // Motion values for smooth swipe
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 1, 1, 1, 0.5]
  );

  useEffect(() => {
    fetchExperts();
  }, []);

  // Restore history from ExpertHistory page if navigating back
  useEffect(() => {
    if (state?.updatedHistory && state.updatedHistory.length > 0) {
      const restoredHistory = state.updatedHistory.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      
      setSwipeHistory(prev => {
        if (prev.length === restoredHistory.length) {
          return prev;
        }
        return restoredHistory;
      });
      
      const selected = restoredHistory
        .filter(item => item.direction === 'right')
        .map(item => item.expert);
      setSelectedExperts(selected);
      
      window.history.replaceState({}, document.title);
    }
  }, [state]);

  const fetchExperts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('experts')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setAllExperts(data);
    }
    setLoading(false);
  };

  const triggerExplosion = useCallback((direction: SwipeDirection) => {
    const icons = direction === 'right' 
      ? ['❤️', '✨', '🔥', '💫', '⭐']
      : direction === 'left'
      ? ['💨', '⚡', '💔', '🌪️', '❌']
      : ['⏳', '🔄', '💭', '🎯', '⏸️'];

    const newIcons = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 160 - 80,
      y: Math.random() * -120 - 40,
      icon: icons[Math.floor(Math.random() * icons.length)],
      type: 'icon' as const
    }));

    const smokeParticles = Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + 100 + i,
      x: Math.random() * 120 - 60,
      y: Math.random() * -100 - 20,
      icon: '💨',
      type: 'smoke' as const
    }));

    const gears = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + 200 + i,
      x: Math.random() * 140 - 70,
      y: Math.random() * -80 - 30,
      icon: '⚙️',
      type: 'gear' as const
    }));

    setExplosionIcons([...newIcons, ...smokeParticles, ...gears]);
    setTimeout(() => setExplosionIcons([]), 800);
  }, []);

  // Send notification when expert is selected
  const sendExpertNotification = useCallback(async (expert: Expert) => {
    const aiSellerData: AISellerData = {
      businessType: sessionStorage.getItem('sav-business-type') || undefined,
      classificationResult: sessionStorage.getItem('sav-classification-result') || undefined,
      selectedPlan: sessionStorage.getItem('sav-selected-plan') || state?.selectedPlan || undefined,
      presentationText: sessionStorage.getItem('sav-presentation-text') || undefined,
    };
    
    const calculatorDataStr = sessionStorage.getItem('sav-calculator-data');
    const calculatorData: CalculatorData = calculatorDataStr ? JSON.parse(calculatorDataStr) : {};
    
    const messageSettings = getMessageConstructorSettings();
    
    try {
      const response = await supabase.functions.invoke('notify-expert-selection', {
        body: {
          expert: {
            id: expert.id,
            greeting: expert.greeting,
            pseudonym: expert.pseudonym,
            spheres: expert.spheres,
          },
          clientInfo: {
            telegramId: telegramProfile?.telegram_id ? String(telegramProfile.telegram_id) : null,
            telegramUsername: telegramProfile?.username || null,
            fullName: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || null,
            firstName: telegramProfile?.first_name || null,
            lastName: telegramProfile?.last_name || null,
          },
          aiSellerInfo: fromAISeller ? aiSellerData : undefined,
          calculatorInfo: calculatorData.company ? calculatorData : undefined,
          source: fromAISeller ? 'ai-seller' : 'calculator',
          messageSettings: messageSettings,
        },
      });
      
      if (response.error) {
        console.error('Error sending notification:', response.error);
      } else {
        const expertName = `${expert.greeting || ''}${expert.pseudonym || ''}`;
        toast({
          title: 'Эксперт выбран!',
          description: `${expertName} получит уведомление о вашем запросе`,
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [telegramProfile, fromAISeller, state?.selectedPlan, toast]);

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (currentIndex >= experts.length) return;
    
    const currentExpert = experts[currentIndex];
    
    // Mark as viewed immediately
    markAsViewed(currentExpert.id, direction);
    
    setSwipeAnimation(direction);
    triggerExplosion(direction);
    
    if (soundEnabled) {
      triggerFeedback(direction);
    }

    // Animate out then update state
    setTimeout(() => {
      setSwipeHistory(prev => {
        // Check for duplicates
        const exists = prev.some(item => item.expert.id === currentExpert.id);
        if (exists) {
          return prev.map(item => 
            item.expert.id === currentExpert.id 
              ? { ...item, direction, timestamp: new Date() }
              : item
          );
        }
        return [...prev, { expert: currentExpert, direction, timestamp: new Date() }];
      });

      if (direction === 'right') {
        setSelectedExperts(prev => {
          if (prev.some(e => e.id === currentExpert.id)) return prev;
          return [...prev, currentExpert];
        });
        sendExpertNotification(currentExpert);
      }
      
      setCurrentIndex(prev => prev + 1);
      setSwipeAnimation(null);
      
      // Reset motion values
      x.set(0);
      y.set(0);
    }, 250);
  }, [currentIndex, experts, triggerExplosion, sendExpertNotification, soundEnabled, triggerFeedback, markAsViewed, x, y]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const threshold = 80; // Lower threshold for easier swiping
    const { offset, velocity } = info;

    // Check velocity for quick flicks
    const xVelocity = Math.abs(velocity.x);
    const yVelocity = Math.abs(velocity.y);

    if (offset.x > threshold || (offset.x > 40 && xVelocity > 500)) {
      handleSwipe('right');
    } else if (offset.x < -threshold || (offset.x < -40 && xVelocity > 500)) {
      handleSwipe('left');
    } else if (offset.y > threshold || (offset.y > 40 && yVelocity > 500)) {
      handleSwipe('down');
    } else {
      // Snap back
      x.set(0);
      y.set(0);
    }
  }, [handleSwipe, x, y]);

  // Tap zone handlers
  const handleTapZone = useCallback((direction: SwipeDirection) => {
    handleSwipe(direction);
  }, [handleSwipe]);

  const resetSwipes = () => {
    setCurrentIndex(0);
    setSwipeHistory([]);
    setSelectedExperts([]);
    clearViewed();
    fetchExperts();
  };

  const navigateToHistory = () => {
    navigate('/experts/history', {
      state: {
        history: swipeHistory,
        selectedExperts: selectedExperts
      }
    });
  };

  const handleConfirmSelection = async () => {
    if (selectedExperts.length === 0) return;
    
    setIsSubmitting(true);
    
    const selectedExpert = selectedExperts[0];
    const expertName = `${selectedExpert.greeting || ''}${selectedExpert.pseudonym || ''}`;
    
    sessionStorage.setItem('sav-selected-expert', JSON.stringify({
      id: selectedExpert.id,
      name: expertName,
      greeting: selectedExpert.greeting,
      pseudonym: selectedExpert.pseudonym,
      spheres: selectedExpert.spheres,
    }));
    
    const aiSellerData: AISellerData = {
      businessType: sessionStorage.getItem('sav-business-type') || undefined,
      classificationResult: sessionStorage.getItem('sav-classification-result') || undefined,
      selectedPlan: sessionStorage.getItem('sav-selected-plan') || state?.selectedPlan || undefined,
      presentationText: sessionStorage.getItem('sav-presentation-text') || undefined,
    };
    
    const calculatorDataStr = sessionStorage.getItem('sav-calculator-data');
    const calculatorData: CalculatorData = calculatorDataStr ? JSON.parse(calculatorDataStr) : {};
    
    const messageSettings = getMessageConstructorSettings();
    
    try {
      const response = await supabase.functions.invoke('notify-expert-selection', {
        body: {
          expert: {
            id: selectedExpert.id,
            greeting: selectedExpert.greeting,
            pseudonym: selectedExpert.pseudonym,
            spheres: selectedExpert.spheres,
          },
          clientInfo: {
            telegramId: telegramProfile?.telegram_id ? String(telegramProfile.telegram_id) : null,
            telegramUsername: telegramProfile?.username || null,
            fullName: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || null,
            firstName: telegramProfile?.first_name || null,
            lastName: telegramProfile?.last_name || null,
          },
          aiSellerInfo: fromAISeller ? aiSellerData : undefined,
          calculatorInfo: calculatorData.company ? calculatorData : undefined,
          source: fromAISeller ? 'ai-seller' : 'calculator',
          messageSettings: messageSettings,
        },
      });
      
      if (response.error) {
        console.error('Error sending notification:', response.error);
        toast({
          title: 'Ошибка отправки',
          description: 'Не удалось отправить уведомление эксперту',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Эксперт выбран!',
          description: `${expertName} получит уведомление о вашем запросе`,
        });
        
        sessionStorage.removeItem('sav-business-type');
        sessionStorage.removeItem('sav-classification-result');
        sessionStorage.removeItem('sav-selected-plan');
        sessionStorage.removeItem('sav-presentation-text');
        sessionStorage.removeItem('sav-calculator-data');
        
        navigate('/');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при отправке',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentExpert = experts[currentIndex];
  const isComplete = currentIndex >= experts.length;
  const currentImageLoading = currentExpert?.photo_url && isLoading(currentExpert.photo_url);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-gear text-6xl text-secondary animate-spin mb-4"></i>
          <p className="text-primary">Загрузка экспертов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden">
      {/* Background gears */}
      <i className="fa-solid fa-gear gear text-9xl top-10 -left-10 opacity-5"></i>
      <i className="fa-solid fa-gear gear text-7xl bottom-20 -right-5 opacity-5" style={{ animationDirection: 'reverse' }}></i>

      {/* Header */}
      <header className="w-full max-w-lg flex justify-between items-center mb-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Назад</span>
        </button>
        <h1 className="text-2xl md:text-3xl text-center">Подбор Эксперта</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all"
            title={soundEnabled ? "Выключить звук" : "Включить звук"}
          >
            {soundEnabled ? (
              <Volume2 size={18} className="text-primary" />
            ) : (
              <VolumeX size={18} className="text-muted-foreground" />
            )}
          </button>
          <button 
            onClick={navigateToHistory}
            className="p-2 rounded-full bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all relative"
            title="История свайпов"
            disabled={swipeHistory.length === 0}
          >
            <History size={18} className="text-primary" />
            {swipeHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {swipeHistory.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setShowInstructions(true)}
            className="p-2 rounded-full bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all"
            title="Инструкция"
          >
            <HelpCircle size={18} className="text-primary" />
          </button>
        </div>
      </header>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="steampunk-border p-6 md:p-8 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <Rivets />
              <h2 className="text-2xl md:text-3xl text-center mb-6">Как выбрать эксперта</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Heart className="text-green-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-green-400">Свайп/тап вправо →</p>
                    <p className="text-sm opacity-70">Выбрать эксперта</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ThumbsDown className="text-red-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-red-400">Свайп/тап влево ←</p>
                    <p className="text-sm opacity-70">Отказаться</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <ChevronDown className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-yellow-400">Свайп/тап вниз ↓</p>
                    <p className="text-sm opacity-70">Пропустить</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowInstructions(false)}
                className="steampunk-button w-full py-3 mt-6"
              >
                <Sparkles size={18} /> Начать подбор
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg relative">
        {/* Explosion Icons */}
        <AnimatePresence>
          {explosionIcons.map(icon => (
            <motion.span
              key={icon.id}
              initial={{ 
                opacity: 1, 
                scale: icon.type === 'gear' ? 0.5 : 1, 
                x: 0, 
                y: 0,
                rotate: 0
              }}
              animate={{ 
                opacity: 0, 
                scale: icon.type === 'smoke' ? 2.5 : icon.type === 'gear' ? 1.2 : 1.5, 
                x: icon.x, 
                y: icon.y,
                rotate: icon.type === 'gear' ? 360 : 0
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: icon.type === 'smoke' ? 0.7 : icon.type === 'gear' ? 0.6 : 0.5, 
                ease: 'easeOut' 
              }}
              className={`absolute z-50 pointer-events-none ${
                icon.type === 'smoke' ? 'text-3xl opacity-60' : 
                icon.type === 'gear' ? 'text-2xl text-secondary' : 
                'text-xl'
              }`}
              style={{ top: '50%', left: '50%' }}
            >
              {icon.icon}
            </motion.span>
          ))}
        </AnimatePresence>

        {isComplete ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="steampunk-border p-8 text-center"
          >
            <Rivets />
            <i className="fa-solid fa-trophy text-6xl text-primary mb-4"></i>
            <h2 className="text-2xl md:text-3xl mb-4">Подбор завершён!</h2>
            <p className="opacity-70 mb-6">
              Выбрано экспертов: <span className="text-primary font-bold">{selectedExperts.length}</span>
            </p>
            
            {fromAISeller && selectedExperts.length > 0 && (
              <button 
                onClick={handleConfirmSelection}
                disabled={isSubmitting}
                className="steampunk-button w-full px-6 py-4 mb-4 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Подтвердить выбор эксперта
                  </>
                )}
              </button>
            )}
            
            <div className="flex flex-col gap-3">
              <button onClick={navigateToHistory} className="steampunk-button px-6 py-3">
                <History size={18} /> Посмотреть историю
              </button>
              <button onClick={resetSwipes} className="steampunk-button px-6 py-3 opacity-70">
                <RotateCcw size={18} /> Пройти заново
              </button>
            </div>
          </motion.div>
        ) : currentExpert && (
          <div className="relative w-full">
            {/* Tap zones overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Left tap zone */}
              <button
                onClick={() => handleTapZone('left')}
                className="absolute left-0 top-0 w-1/4 h-4/5 pointer-events-auto active:bg-red-500/10 transition-colors rounded-l-xl"
                aria-label="Отказаться"
              />
              {/* Right tap zone */}
              <button
                onClick={() => handleTapZone('right')}
                className="absolute right-0 top-0 w-1/4 h-4/5 pointer-events-auto active:bg-green-500/10 transition-colors rounded-r-xl"
                aria-label="Выбрать"
              />
              {/* Bottom tap zone */}
              <button
                onClick={() => handleTapZone('down')}
                className="absolute bottom-0 left-1/4 w-1/2 h-1/5 pointer-events-auto active:bg-yellow-500/10 transition-colors rounded-b-xl"
                aria-label="Пропустить"
              />
            </div>

            {/* Card Stack Preview */}
            {experts.slice(currentIndex + 1, currentIndex + 3).map((_, i) => (
              <div
                key={i}
                className="absolute w-full steampunk-border p-4 bg-background/30"
                style={{
                  transform: `scale(${0.95 - i * 0.03}) translateY(${(i + 1) * 10}px)`,
                  opacity: 0.4 - i * 0.15,
                  zIndex: -i - 1,
                }}
              />
            ))}

            {/* Main Card */}
            <motion.div
              key={currentExpert.id}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.9}
              onDragEnd={handleDragEnd}
              style={{ x, y, rotate, opacity }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={
                swipeAnimation === 'right' ? { x: 400, opacity: 0, rotate: 15, scale: 0.9 } :
                swipeAnimation === 'left' ? { x: -400, opacity: 0, rotate: -15, scale: 0.9 } :
                swipeAnimation === 'down' ? { y: 400, opacity: 0, scale: 0.9 } :
                { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
              }
              transition={{ 
                type: 'spring', 
                damping: 25, 
                stiffness: 300,
                mass: 0.5
              }}
              className="steampunk-border p-4 md:p-6 w-full cursor-grab active:cursor-grabbing relative z-10 touch-pan-y will-change-transform"
              whileDrag={{ scale: 1.02 }}
            >
              <Rivets />
              
              {/* Expert Photo with transparency */}
              {currentExpert.photo_url && (
                <div className="relative mb-4 rounded-xl overflow-hidden aspect-video">
                  {currentImageLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <img 
                      src={currentExpert.photo_url} 
                      alt={currentExpert.pseudonym || 'Expert'}
                      className="w-full h-full object-cover opacity-80"
                      loading="eager"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <h3 className="text-2xl md:text-3xl text-white drop-shadow-lg">
                      {currentExpert.greeting}{currentExpert.pseudonym}
                    </h3>
                  </div>
                </div>
              )}

              {!currentExpert.photo_url && (
                <div className="mb-4">
                  <h3 className="text-2xl md:text-3xl text-primary">
                    {currentExpert.greeting}{currentExpert.pseudonym}
                  </h3>
                </div>
              )}

              {/* Expert Info with transparency */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 bg-background/40 backdrop-blur-sm rounded-lg p-3 -mx-1">
                {currentExpert.spheres && (
                  <div>
                    <p className="text-primary text-xs uppercase mb-1 opacity-70">💰 Сферы</p>
                    <p className="text-sm opacity-70">{currentExpert.spheres}</p>
                  </div>
                )}
                {currentExpert.tools && (
                  <div>
                    <p className="text-primary text-xs uppercase mb-1 opacity-70">⚒️ Инструменты</p>
                    <p className="text-sm opacity-70 line-clamp-2">{currentExpert.tools}</p>
                  </div>
                )}
                {currentExpert.cases && (
                  <div>
                    <p className="text-primary text-xs uppercase mb-1 opacity-70">🤖 Кейсы</p>
                    <p className="text-sm opacity-70 line-clamp-2">{currentExpert.cases}</p>
                  </div>
                )}
                {currentExpert.other_info && (
                  <div>
                    <p className="text-primary text-xs uppercase mb-1 opacity-70">📌 Другое</p>
                    <p className="text-sm opacity-70 line-clamp-2">{currentExpert.other_info}</p>
                  </div>
                )}
              </div>

              {/* Card Counter */}
              <div className="mt-4 pt-3 border-t border-foreground/10 flex justify-between items-center">
                <span className="text-xs opacity-50">
                  {currentIndex + 1} / {experts.length}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(experts.length, 5) }).map((_, i) => (
                    <div 
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i === currentIndex % 5 ? 'bg-primary' : 'bg-foreground/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isComplete && currentExpert && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe('left')}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center hover:bg-red-500/30 transition-all shadow-lg active:scale-90"
          >
            <X className="text-red-400" size={28} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe('down')}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center hover:bg-yellow-500/30 transition-all shadow-lg active:scale-90"
          >
            <ChevronDown className="text-yellow-400" size={24} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe('right')}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center hover:bg-green-500/30 transition-all shadow-lg active:scale-90"
          >
            <Heart className="text-green-400" size={28} />
          </motion.button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-6 text-center">
        <p className="text-[10px] uppercase tracking-widest opacity-30">
          Свайп, тап или кнопки • История сохраняется
        </p>
      </footer>
    </div>
  );
};

export default ExpertSelection;

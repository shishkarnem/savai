import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, ChevronDown, RotateCcw, History, HelpCircle, Sparkles, Heart, ThumbsDown, ArrowLeft, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';
import Rivets from '@/components/Rivets';
import ExpertCard, { Expert, SwipeDirection } from '@/components/ExpertCard';
import { useSwipeFeedback } from '@/hooks/useSwipeFeedback';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useToast } from '@/hooks/use-toast';

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

  const [experts, setExperts] = useState<Expert[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);
  const [selectedExperts, setSelectedExperts] = useState<Expert[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [swipeAnimation, setSwipeAnimation] = useState<SwipeDirection | null>(null);
  const [explosionIcons, setExplosionIcons] = useState<{ id: number; x: number; y: number; icon: string; type: 'icon' | 'smoke' | 'gear' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detect if coming from AI Seller flow
  const fromAISeller = state?.fromAISeller || sessionStorage.getItem('sav-selected-plan');
  
  const { triggerFeedback } = useSwipeFeedback();

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
      
      // Only update if history is different (prevent duplicates)
      setSwipeHistory(prev => {
        // If we already have this history, don't update
        if (prev.length === restoredHistory.length) {
          return prev;
        }
        return restoredHistory;
      });
      
      // Update selected experts based on updated history
      const selected = restoredHistory
        .filter(item => item.direction === 'right')
        .map(item => item.expert);
      setSelectedExperts(selected);
      
      // Clear state to prevent re-triggering
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
      setExperts(data);
    }
    setLoading(false);
  };

  const triggerExplosion = useCallback((direction: SwipeDirection) => {
    const icons = direction === 'right' 
      ? ['❤️', '✨', '🔥', '💫', '⭐']
      : direction === 'left'
      ? ['💨', '⚡', '💔', '🌪️', '❌']
      : ['⏳', '🔄', '💭', '🎯', '⏸️'];

    // Main icons
    const newIcons = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200 - 100,
      y: Math.random() * -150 - 50,
      icon: icons[Math.floor(Math.random() * icons.length)],
      type: 'icon' as const
    }));

    // Smoke particles
    const smokeParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + 100 + i,
      x: Math.random() * 160 - 80,
      y: Math.random() * -120 - 30,
      icon: '💨',
      type: 'smoke' as const
    }));

    // Gears
    const gears = Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + 200 + i,
      x: Math.random() * 180 - 90,
      y: Math.random() * -100 - 40,
      icon: '⚙️',
      type: 'gear' as const
    }));

    setExplosionIcons([...newIcons, ...smokeParticles, ...gears]);
    setTimeout(() => setExplosionIcons([]), 1000);
  }, []);

  // Send notification when expert is selected (swipe right)
  const sendExpertNotification = useCallback(async (expert: Expert) => {
    // Get AI Seller data from sessionStorage
    const aiSellerData: AISellerData = {
      businessType: sessionStorage.getItem('sav-business-type') || undefined,
      classificationResult: sessionStorage.getItem('sav-classification-result') || undefined,
      selectedPlan: sessionStorage.getItem('sav-selected-plan') || state?.selectedPlan || undefined,
      presentationText: sessionStorage.getItem('sav-presentation-text') || undefined,
    };
    
    // Get calculator data if exists
    const calculatorDataStr = sessionStorage.getItem('sav-calculator-data');
    const calculatorData: CalculatorData = calculatorDataStr ? JSON.parse(calculatorDataStr) : {};
    
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
    setSwipeAnimation(direction);
    triggerExplosion(direction);
    
    // Trigger haptic feedback and sound
    if (soundEnabled) {
      triggerFeedback(direction);
    }

    setTimeout(() => {
      setSwipeHistory(prev => [...prev, { 
        expert: currentExpert, 
        direction, 
        timestamp: new Date() 
      }]);

      if (direction === 'right') {
        setSelectedExperts(prev => [...prev, currentExpert]);
        setCurrentIndex(prev => prev + 1);
        // Send notification immediately when expert is selected
        sendExpertNotification(currentExpert);
      } else if (direction === 'down') {
        // Move to end of queue - don't increment index since array shifts
        setExperts(prev => [...prev.slice(0, currentIndex), ...prev.slice(currentIndex + 1), currentExpert]);
      } else {
        // left - reject
        setCurrentIndex(prev => prev + 1);
      }
      
      setSwipeAnimation(null);
    }, 300);
  }, [currentIndex, experts, triggerExplosion, sendExpertNotification, soundEnabled, triggerFeedback]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    const { offset } = info;

    if (offset.x > threshold) {
      handleSwipe('right');
    } else if (offset.x < -threshold) {
      handleSwipe('left');
    } else if (offset.y > threshold) {
      handleSwipe('down');
    }
  };

  const resetSwipes = () => {
    setCurrentIndex(0);
    setSwipeHistory([]);
    setSelectedExperts([]);
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

  // Handle confirm selection - save to sessionStorage and send notification
  const handleConfirmSelection = async () => {
    if (selectedExperts.length === 0) return;
    
    setIsSubmitting(true);
    
    const selectedExpert = selectedExperts[0]; // Take first selected expert
    const expertName = `${selectedExpert.greeting || ''}${selectedExpert.pseudonym || ''}`;
    
    // Save to sessionStorage for form submission
    sessionStorage.setItem('sav-selected-expert', JSON.stringify({
      id: selectedExpert.id,
      name: expertName,
      greeting: selectedExpert.greeting,
      pseudonym: selectedExpert.pseudonym,
      spheres: selectedExpert.spheres,
    }));
    
    // Get AI Seller data from sessionStorage
    const aiSellerData: AISellerData = {
      businessType: sessionStorage.getItem('sav-business-type') || undefined,
      classificationResult: sessionStorage.getItem('sav-classification-result') || undefined,
      selectedPlan: sessionStorage.getItem('sav-selected-plan') || state?.selectedPlan || undefined,
      presentationText: sessionStorage.getItem('sav-presentation-text') || undefined,
    };
    
    // Get calculator data if exists
    const calculatorDataStr = sessionStorage.getItem('sav-calculator-data');
    const calculatorData: CalculatorData = calculatorDataStr ? JSON.parse(calculatorDataStr) : {};
    
    try {
      // Send notification to expert chat
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
        
        // Clear session data after successful submission
        sessionStorage.removeItem('sav-business-type');
        sessionStorage.removeItem('sav-classification-result');
        sessionStorage.removeItem('sav-selected-plan');
        sessionStorage.removeItem('sav-presentation-text');
        sessionStorage.removeItem('sav-calculator-data');
        
        // Navigate to success or home
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
                    <p className="font-bold text-green-400">Свайп вправо →</p>
                    <p className="text-sm opacity-70">Выбрать эксперта</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ThumbsDown className="text-red-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-red-400">Свайп влево ←</p>
                    <p className="text-sm opacity-70">Отказаться</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <ChevronDown className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-yellow-400">Свайп вниз ↓</p>
                    <p className="text-sm opacity-70">Пропустить (вернётся в конец)</p>
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
        {/* Explosion Icons, Smoke & Gears */}
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
                scale: icon.type === 'smoke' ? 3 : icon.type === 'gear' ? 1.5 : 2, 
                x: icon.x, 
                y: icon.y,
                rotate: icon.type === 'gear' ? 360 : 0
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: icon.type === 'smoke' ? 1 : icon.type === 'gear' ? 0.8 : 0.6, 
                ease: 'easeOut' 
              }}
              className={`absolute z-50 pointer-events-none ${
                icon.type === 'smoke' ? 'text-4xl opacity-60' : 
                icon.type === 'gear' ? 'text-3xl text-secondary' : 
                'text-2xl'
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
            
            {/* Show confirm button if coming from a flow */}
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
          <>
            {/* Card Stack Preview */}
            {experts.slice(currentIndex + 1, currentIndex + 3).map((_, i) => (
              <div
                key={i}
                className="absolute w-full steampunk-border p-4"
                style={{
                  transform: `perspective(1000px) rotateX(8deg) scale(${0.95 - i * 0.03}) translateY(${(i + 1) * 12}px)`,
                  opacity: 0.5 - i * 0.2,
                  zIndex: -i - 1,
                  transformOrigin: 'center top'
                }}
              />
            ))}

            {/* Main Card */}
            <motion.div
              key={currentExpert.id}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              initial={{ rotateX: 8 }}
              animate={
                swipeAnimation === 'right' ? { x: 500, opacity: 0, rotate: 20, rotateX: 0 } :
                swipeAnimation === 'left' ? { x: -500, opacity: 0, rotate: -20, rotateX: 0 } :
                swipeAnimation === 'down' ? { y: 500, opacity: 0, rotateX: 25 } :
                { x: 0, y: 0, rotate: 0, rotateX: 8 }
              }
              transition={{ type: 'spring', damping: 20 }}
              className="steampunk-border p-4 md:p-6 w-full cursor-grab active:cursor-grabbing relative z-10"
              style={{ perspective: 1000, transformOrigin: 'center top' }}
              whileDrag={{ scale: 1.02, rotateX: 0 }}
            >
              <Rivets />
              
              {/* Expert Photo */}
              {currentExpert.photo_url && (
                <div className="relative mb-4 rounded-xl overflow-hidden aspect-video">
                  <img 
                    src={currentExpert.photo_url} 
                    alt={currentExpert.pseudonym || 'Expert'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
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

              {/* Expert Info */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {currentExpert.spheres && (
                  <div>
                    <p className="text-primary text-xs uppercase mb-1 opacity-70">💰 Сферы</p>
                    <p className="text-sm opacity-80">{currentExpert.spheres}</p>
                  </div>
                )}
                {currentExpert.tools && (
                  <div>
                    <p className="text-primary text-xs uppercase mb-1 opacity-70">⚒️ Инструменты</p>
                    <p className="text-sm opacity-80 line-clamp-2">{currentExpert.tools}</p>
                  </div>
                )}
                {currentExpert.cases && (
                  <div>
                    <p className="text-primary text-xs uppercase mb-1 opacity-70">🤖 Кейсы</p>
                    <p className="text-sm opacity-80 line-clamp-2">{currentExpert.cases}</p>
                  </div>
                )}
                {currentExpert.other_info && (
                  <div>
                    <p className="text-primary text-xs uppercase mb-1 opacity-70">📌 Другое</p>
                    <p className="text-sm opacity-80 line-clamp-2">{currentExpert.other_info}</p>
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
          </>
        )}
      </div>

      {/* Action Buttons */}
      {!isComplete && currentExpert && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe('left')}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center hover:bg-red-500/30 transition-all shadow-lg"
          >
            <X className="text-red-400" size={28} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe('down')}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center hover:bg-yellow-500/30 transition-all shadow-lg"
          >
            <ChevronDown className="text-yellow-400" size={24} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe('right')}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center hover:bg-green-500/30 transition-all shadow-lg"
          >
            <Heart className="text-green-400" size={28} />
          </motion.button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-6 text-center">
        <p className="text-[10px] uppercase tracking-widest opacity-30">
          Перетащите карточку или используйте кнопки
        </p>
      </footer>
    </div>
  );
};

export default ExpertSelection;

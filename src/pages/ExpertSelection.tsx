import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, ChevronDown, RotateCcw, History, HelpCircle, Sparkles, Heart, ThumbsDown, ArrowLeft } from 'lucide-react';
import Rivets from '@/components/Rivets';

interface Expert {
  id: string;
  pseudonym: string | null;
  greeting: string | null;
  tools: string | null;
  spheres: string | null;
  cases: string | null;
  other_info: string | null;
  description: string | null;
  photo_url: string | null;
}

type SwipeDirection = 'left' | 'right' | 'down';

interface SwipeHistoryItem {
  expert: Expert;
  direction: SwipeDirection;
  timestamp: Date;
}

const ExpertSelection: React.FC = () => {
  const navigate = useNavigate();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);
  const [selectedExperts, setSelectedExperts] = useState<Expert[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [swipeAnimation, setSwipeAnimation] = useState<SwipeDirection | null>(null);
  const [explosionIcons, setExplosionIcons] = useState<{ id: number; x: number; y: number; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExperts();
  }, []);

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
      ? ['❤️', '✨', '⚙️', '🔥', '💫']
      : direction === 'left'
      ? ['💨', '⚡', '🔧', '💔', '🌪️']
      : ['⏳', '🔄', '⚙️', '💭', '🎯'];

    const newIcons = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200 - 100,
      y: Math.random() * -150 - 50,
      icon: icons[Math.floor(Math.random() * icons.length)]
    }));

    setExplosionIcons(newIcons);
    setTimeout(() => setExplosionIcons([]), 800);
  }, []);

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (currentIndex >= experts.length) return;
    
    const currentExpert = experts[currentIndex];
    setSwipeAnimation(direction);
    triggerExplosion(direction);

    setTimeout(() => {
      setSwipeHistory(prev => [...prev, { 
        expert: currentExpert, 
        direction, 
        timestamp: new Date() 
      }]);

      if (direction === 'right') {
        setSelectedExperts(prev => [...prev, currentExpert]);
      } else if (direction === 'down') {
        // Move to end of queue
        setExperts(prev => [...prev.slice(0, currentIndex), ...prev.slice(currentIndex + 1), currentExpert]);
      } else {
        setCurrentIndex(prev => prev + 1);
      }

      if (direction !== 'down') {
        setCurrentIndex(prev => prev + 1);
      }
      
      setSwipeAnimation(null);
    }, 300);
  }, [currentIndex, experts, triggerExplosion]);

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
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-full bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all"
            title="История свайпов"
          >
            <History size={18} className="text-primary" />
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

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 h-full w-80 bg-card/95 backdrop-blur-xl border-l border-foreground/10 z-40 p-4 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl text-primary">История свайпов</h3>
              <button onClick={() => setShowHistory(false)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            {swipeHistory.length === 0 ? (
              <p className="text-center opacity-50 italic">Пока пусто...</p>
            ) : (
              <div className="space-y-2">
                {swipeHistory.slice().reverse().map((item, i) => (
                  <div 
                    key={i}
                    className={`p-3 rounded-xl border ${
                      item.direction === 'right' ? 'bg-green-500/10 border-green-500/30' :
                      item.direction === 'left' ? 'bg-red-500/10 border-red-500/30' :
                      'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.direction === 'right' ? <Heart size={14} className="text-green-400" /> :
                       item.direction === 'left' ? <ThumbsDown size={14} className="text-red-400" /> :
                       <ChevronDown size={14} className="text-yellow-400" />}
                      <span className="font-bold text-sm">
                        {item.expert.greeting}{item.expert.pseudonym}
                      </span>
                    </div>
                    <p className="text-[10px] opacity-50 mt-1">
                      {item.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {selectedExperts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-foreground/10">
                <h4 className="text-primary text-sm mb-2">Выбранные ({selectedExperts.length})</h4>
                <div className="space-y-1">
                  {selectedExperts.map((exp, i) => (
                    <div key={i} className="text-xs flex items-center gap-2">
                      <Check size={12} className="text-green-400" />
                      {exp.greeting}{exp.pseudonym}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              animate={{ opacity: 0, scale: 2, x: icon.x, y: icon.y }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute text-2xl z-50 pointer-events-none"
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
            <button onClick={resetSwipes} className="steampunk-button px-6 py-3">
              <RotateCcw size={18} /> Пройти заново
            </button>
          </motion.div>
        ) : currentExpert && (
          <>
            {/* Card Stack Preview */}
            {experts.slice(currentIndex + 1, currentIndex + 3).map((_, i) => (
              <div
                key={i}
                className="absolute w-full steampunk-border p-4"
                style={{
                  transform: `scale(${0.95 - i * 0.03}) translateY(${(i + 1) * 8}px)`,
                  opacity: 0.5 - i * 0.2,
                  zIndex: -i - 1
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
              animate={
                swipeAnimation === 'right' ? { x: 500, opacity: 0, rotate: 20 } :
                swipeAnimation === 'left' ? { x: -500, opacity: 0, rotate: -20 } :
                swipeAnimation === 'down' ? { y: 500, opacity: 0 } :
                { x: 0, y: 0, rotate: 0 }
              }
              transition={{ type: 'spring', damping: 20 }}
              className="steampunk-border p-4 md:p-6 w-full cursor-grab active:cursor-grabbing relative z-10"
              whileDrag={{ scale: 1.02 }}
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

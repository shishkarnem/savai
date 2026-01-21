import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Heart, ThumbsDown, ChevronDown, X, Sparkles, Filter } from 'lucide-react';
import ExpertCard, { Expert, SwipeDirection } from '@/components/ExpertCard';
import Rivets from '@/components/Rivets';

interface SwipeHistoryItem {
  expert: Expert;
  direction: SwipeDirection;
  timestamp: Date;
}

interface LocationState {
  history: SwipeHistoryItem[];
  selectedExperts: Expert[];
}

const ExpertHistory: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const [history, setHistory] = useState<SwipeHistoryItem[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<SwipeHistoryItem | null>(null);
  const [explosionIcons, setExplosionIcons] = useState<{ id: number; x: number; y: number; icon: string }[]>([]);
  const [activeFilter, setActiveFilter] = useState<SwipeDirection | 'all'>('all');

  useEffect(() => {
    if (state?.history) {
      // Restore timestamps as Date objects
      const restoredHistory = state.history.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      setHistory(restoredHistory);
    }
  }, [state]);

  const triggerExplosion = (direction: SwipeDirection) => {
    const icons = direction === 'right' 
      ? ['❤️', '✨', '⚙️', '🔥', '💫']
      : direction === 'left'
      ? ['💨', '⚡', '🔧', '💔', '🌪️']
      : ['⏳', '🔄', '⚙️', '💭', '🎯'];

    const newIcons = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 150 - 75,
      y: Math.random() * -100 - 30,
      icon: icons[Math.floor(Math.random() * icons.length)]
    }));

    setExplosionIcons(newIcons);
    setTimeout(() => setExplosionIcons([]), 600);
  };

  const handleChangeDirection = (expertId: string, newDirection: SwipeDirection) => {
    triggerExplosion(newDirection);
    
    setHistory(prev => prev.map(item => 
      item.expert.id === expertId 
        ? { ...item, direction: newDirection, timestamp: new Date() }
        : item
    ));

    // Update selected expert if modal is open
    if (selectedExpert?.expert.id === expertId) {
      setSelectedExpert(prev => prev ? { ...prev, direction: newDirection, timestamp: new Date() } : null);
    }
  };

  const getStats = () => {
    const selected = history.filter(h => h.direction === 'right').length;
    const rejected = history.filter(h => h.direction === 'left').length;
    const skipped = history.filter(h => h.direction === 'down').length;
    return { selected, rejected, skipped, total: history.length };
  };

  const stats = getStats();

  const handleBackWithState = () => {
    navigate('/experts', { 
      state: { 
        updatedHistory: history 
      } 
    });
  };

  if (!state?.history || history.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="steampunk-border p-8 text-center max-w-md">
          <Rivets />
          <i className="fa-solid fa-inbox text-6xl text-primary mb-4 opacity-50"></i>
          <h2 className="text-2xl mb-4">История пуста</h2>
          <p className="opacity-70 mb-6">Сначала просмотрите несколько экспертов</p>
          <button 
            onClick={() => navigate('/experts')}
            className="steampunk-button px-6 py-3"
          >
            <ArrowLeft size={18} /> К подбору экспертов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 relative overflow-hidden">
      {/* Background gears */}
      <i className="fa-solid fa-gear gear text-9xl top-10 -left-10 opacity-5"></i>
      <i className="fa-solid fa-gear gear text-7xl bottom-20 -right-5 opacity-5" style={{ animationDirection: 'reverse' }}></i>

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto flex justify-between items-center mb-6">
        <button 
          onClick={handleBackWithState}
          className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Назад</span>
        </button>
        <h1 className="text-2xl md:text-3xl text-center">История свайпов</h1>
        <div className="w-20" /> {/* Spacer for centering */}
      </header>

      {/* Stats & Filters */}
      <div className="w-full max-w-4xl mx-auto mb-6">
        <div className="steampunk-border p-4">
          <Rivets />
          <div className="grid grid-cols-4 gap-2 md:gap-4 text-center">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`p-2 rounded-xl transition-all ${
                activeFilter === 'all' 
                  ? 'bg-primary/20 border border-primary/50' 
                  : 'hover:bg-foreground/5'
              }`}
            >
              <p className="text-xl md:text-3xl text-primary font-bold">{stats.total}</p>
              <p className="text-[10px] md:text-xs opacity-60 uppercase">Всего</p>
            </button>
            <button 
              onClick={() => setActiveFilter('right')}
              className={`p-2 rounded-xl transition-all ${
                activeFilter === 'right' 
                  ? 'bg-green-500/20 border border-green-500/50' 
                  : 'hover:bg-foreground/5'
              }`}
            >
              <p className="text-xl md:text-3xl text-green-400 font-bold">{stats.selected}</p>
              <p className="text-[10px] md:text-xs opacity-60 uppercase">Выбрано</p>
            </button>
            <button 
              onClick={() => setActiveFilter('left')}
              className={`p-2 rounded-xl transition-all ${
                activeFilter === 'left' 
                  ? 'bg-red-500/20 border border-red-500/50' 
                  : 'hover:bg-foreground/5'
              }`}
            >
              <p className="text-xl md:text-3xl text-red-400 font-bold">{stats.rejected}</p>
              <p className="text-[10px] md:text-xs opacity-60 uppercase">Отказов</p>
            </button>
            <button 
              onClick={() => setActiveFilter('down')}
              className={`p-2 rounded-xl transition-all ${
                activeFilter === 'down' 
                  ? 'bg-yellow-500/20 border border-yellow-500/50' 
                  : 'hover:bg-foreground/5'
              }`}
            >
              <p className="text-xl md:text-3xl text-yellow-400 font-bold">{stats.skipped}</p>
              <p className="text-[10px] md:text-xs opacity-60 uppercase">Пропущено</p>
            </button>
          </div>
        </div>
      </div>

      {/* History Grid */}
      <div className="w-full max-w-4xl mx-auto flex-1">
        {history.filter(h => activeFilter === 'all' || h.direction === activeFilter).length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <Filter size={48} className="mx-auto mb-4 opacity-30" />
            <p>Нет экспертов с таким статусом</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history
              .filter(h => activeFilter === 'all' || h.direction === activeFilter)
              .slice()
              .reverse()
              .map((item, index) => (
                <motion.div
                  key={`${item.expert.id}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedExpert(item)}
                  className="cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <ExpertCard
                    expert={item.expert}
                    currentDirection={item.direction}
                    showActions={true}
                    onAction={(dir) => handleChangeDirection(item.expert.id, dir)}
                    compact={true}
                  />
                </motion.div>
              ))}
          </div>
        )}
      </div>

      {/* Expert Detail Modal */}
      <AnimatePresence>
        {selectedExpert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedExpert(null)}
          >
            {/* Explosion Icons */}
            {explosionIcons.map(icon => (
              <motion.span
                key={icon.id}
                initial={{ opacity: 1, scale: 1, x: '50%', y: '50%' }}
                animate={{ opacity: 0, scale: 2, x: `calc(50% + ${icon.x}px)`, y: `calc(50% + ${icon.y}px)` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute text-2xl z-[60] pointer-events-none"
                style={{ top: '40%', left: '50%' }}
              >
                {icon.icon}
              </motion.span>
            ))}

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedExpert(null)}
                className="absolute -top-12 right-0 text-foreground/50 hover:text-foreground z-10"
              >
                <X size={24} />
              </button>
              
              <ExpertCard
                expert={selectedExpert.expert}
                currentDirection={selectedExpert.direction}
                showActions={true}
                onAction={(dir) => handleChangeDirection(selectedExpert.expert.id, dir)}
              />

              <p className="text-center text-xs opacity-50 mt-4">
                Последнее изменение: {selectedExpert.timestamp.toLocaleString()}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-6 text-center">
        <p className="text-[10px] uppercase tracking-widest opacity-30">
          Нажмите на карточку для подробностей
        </p>
      </footer>
    </div>
  );
};

export default ExpertHistory;

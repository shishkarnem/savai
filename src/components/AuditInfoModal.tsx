import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, History, ArrowLeft, Shield, Star, Zap } from 'lucide-react';
import Rivets from '@/components/Rivets';

interface AuditInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  expertName: string;
  onGoToHistory: () => void;
  onGoToSwipes: () => void;
}

const AuditInfoModal: React.FC<AuditInfoModalProps> = ({
  isOpen,
  onClose,
  expertName,
  onGoToHistory,
  onGoToSwipes,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 250 }}
            className="steampunk-border p-6 md:p-8 max-w-md w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Rivets />

            {/* Decorative gradient */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-accent/10 blur-2xl" />

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border-2 border-primary/40"
            >
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl md:text-3xl text-center text-primary mb-3 font-bold"
            >
              Превосходный выбор!
            </motion.h2>

            {/* Expert name */}
            {expertName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-center text-lg mb-4 text-accent"
              >
                {expertName}
              </motion.p>
            )}

            {/* Info cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 mb-6"
            >
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm">
                  Наш эксперт проведёт для вас <span className="text-primary font-semibold">бесплатный аудит</span> вашей текущей системы и предложит лучшие решения для автоматизации.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/5 border border-accent/20">
                <Star className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <p className="text-sm">
                  В ближайшее время эксперт свяжется с вами через Telegram для обсуждения деталей и назначения удобного времени.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                <Zap className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <p className="text-sm">
                  Аудит включает анализ бизнес-процессов, рекомендации по внедрению ИИ и персональный план развития.
                </p>
              </div>
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={onGoToHistory}
                className="steampunk-button w-full py-3 flex items-center justify-center gap-2"
              >
                <History size={18} />
                История свайпов
              </button>
              <button
                onClick={onGoToSwipes}
                className="w-full py-3 border border-foreground/20 rounded-xl text-primary hover:bg-foreground/5 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Вернуться к подбору
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuditInfoModal;

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ModelLoadingIndicatorProps {
  isLoading: boolean;
  progress: number;
  modelName?: string;
}

export const ModelLoadingIndicator: React.FC<ModelLoadingIndicatorProps> = ({
  isLoading,
  progress,
  modelName = 'модели',
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          {/* Steampunk container */}
          <div className="relative bg-gradient-to-b from-[#2a1810] to-[#1a0f08] rounded-lg border-2 border-brass/60 shadow-2xl px-6 py-3 min-w-[280px]">
            {/* Corner rivets */}
            <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-brass shadow-inner" />
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brass shadow-inner" />
            <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-brass shadow-inner" />
            <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-brass shadow-inner" />
            
            {/* Gear decoration */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <i className="fa-solid fa-gear text-brass text-lg drop-shadow-md" />
              </motion.div>
            </div>
            
            {/* Status text */}
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4 text-brass" />
              </motion.div>
              <span className="text-brass/90 text-xs font-serif uppercase tracking-wider">
                Загрузка {modelName}
              </span>
            </div>
            
            {/* Progress bar container */}
            <div className="relative h-4 bg-[#0a0604] rounded border border-brass/40 overflow-hidden">
              {/* Brass pipe effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
              
              {/* Progress fill */}
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-700 via-brass to-amber-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Steam/glow effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent" />
                <motion.div
                  className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </motion.div>
              
              {/* Gauge marks */}
              <div className="absolute inset-0 flex justify-between px-1">
                {[...Array(10)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-px h-1 bg-brass/30 mt-auto mb-0.5" 
                  />
                ))}
              </div>
            </div>
            
            {/* Percentage */}
            <div className="flex justify-between mt-1">
              <span className="text-brass/60 text-[10px] font-mono">0%</span>
              <span className="text-brass text-xs font-mono font-bold">{progress}%</span>
              <span className="text-brass/60 text-[10px] font-mono">100%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModelLoadingIndicator;

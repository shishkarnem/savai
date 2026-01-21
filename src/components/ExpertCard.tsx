import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ThumbsDown, ChevronDown } from 'lucide-react';
import Rivets from '@/components/Rivets';

export interface Expert {
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

export type SwipeDirection = 'left' | 'right' | 'down';

interface ExpertCardProps {
  expert: Expert;
  showActions?: boolean;
  currentDirection?: SwipeDirection | null;
  onAction?: (direction: SwipeDirection) => void;
  compact?: boolean;
  className?: string;
}

const ExpertCard: React.FC<ExpertCardProps> = ({
  expert,
  showActions = false,
  currentDirection,
  onAction,
  compact = false,
  className = ''
}) => {
  const getDirectionColor = (dir: SwipeDirection) => {
    switch (dir) {
      case 'right': return 'border-green-500/50 bg-green-500/10';
      case 'left': return 'border-red-500/50 bg-red-500/10';
      case 'down': return 'border-yellow-500/50 bg-yellow-500/10';
    }
  };

  const getDirectionIcon = (dir: SwipeDirection) => {
    switch (dir) {
      case 'right': return <Heart size={16} className="text-green-400" />;
      case 'left': return <ThumbsDown size={16} className="text-red-400" />;
      case 'down': return <ChevronDown size={16} className="text-yellow-400" />;
    }
  };

  const getDirectionLabel = (dir: SwipeDirection) => {
    switch (dir) {
      case 'right': return 'Выбран';
      case 'left': return 'Отказ';
      case 'down': return 'Пропущен';
    }
  };

  return (
    <div 
      className={`steampunk-border ${compact ? 'p-3' : 'p-4 md:p-6'} w-full relative ${
        currentDirection ? getDirectionColor(currentDirection) : ''
      } ${className}`}
    >
      <Rivets />

      {/* Status Badge */}
      {currentDirection && (
        <div className={`absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-full text-xs backdrop-blur-sm ${getDirectionColor(currentDirection)}`}>
          {getDirectionIcon(currentDirection)}
          <span>{getDirectionLabel(currentDirection)}</span>
        </div>
      )}
      
      {/* Expert Photo */}
      {expert.photo_url && (
        <div className={`relative ${compact ? 'mb-2' : 'mb-4'} rounded-xl overflow-hidden ${compact ? 'aspect-[16/9]' : 'aspect-video'}`}>
          <img 
            src={expert.photo_url} 
            alt={expert.pseudonym || 'Expert'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2">
            <h3 className={`${compact ? 'text-lg' : 'text-2xl md:text-3xl'} text-white drop-shadow-lg`}>
              {expert.greeting}{expert.pseudonym}
            </h3>
          </div>
        </div>
      )}

      {!expert.photo_url && (
        <div className={`${compact ? 'mb-2' : 'mb-4'}`}>
          <h3 className={`${compact ? 'text-lg' : 'text-2xl md:text-3xl'} text-primary`}>
            {expert.greeting}{expert.pseudonym}
          </h3>
        </div>
      )}

      {/* Expert Info */}
      <div className={`space-y-2 ${compact ? 'max-h-32' : 'max-h-64'} overflow-y-auto pr-2`}>
        {expert.spheres && (
          <div>
            <p className="text-primary text-xs uppercase mb-1 opacity-70">💰 Сферы</p>
            <p className={`text-sm opacity-80 ${compact ? 'line-clamp-1' : ''}`}>{expert.spheres}</p>
          </div>
        )}
        {expert.tools && (
          <div>
            <p className="text-primary text-xs uppercase mb-1 opacity-70">⚒️ Инструменты</p>
            <p className={`text-sm opacity-80 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>{expert.tools}</p>
          </div>
        )}
        {!compact && expert.cases && (
          <div>
            <p className="text-primary text-xs uppercase mb-1 opacity-70">🤖 Кейсы</p>
            <p className="text-sm opacity-80 line-clamp-2">{expert.cases}</p>
          </div>
        )}
        {!compact && expert.other_info && (
          <div>
            <p className="text-primary text-xs uppercase mb-1 opacity-70">📌 Другое</p>
            <p className="text-sm opacity-80 line-clamp-2">{expert.other_info}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && onAction && (
        <div className={`flex items-center justify-center gap-3 ${compact ? 'mt-3 pt-2' : 'mt-4 pt-3'} border-t border-foreground/10`}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onAction('left'); }}
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center hover:bg-red-500/30 transition-all ${
              currentDirection === 'left' ? 'ring-2 ring-red-400' : ''
            }`}
            title="Отказаться"
          >
            <ThumbsDown className="text-red-400" size={compact ? 16 : 20} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onAction('down'); }}
            className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center hover:bg-yellow-500/30 transition-all ${
              currentDirection === 'down' ? 'ring-2 ring-yellow-400' : ''
            }`}
            title="Пропустить"
          >
            <ChevronDown className="text-yellow-400" size={compact ? 14 : 18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onAction('right'); }}
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center hover:bg-green-500/30 transition-all ${
              currentDirection === 'right' ? 'ring-2 ring-green-400' : ''
            }`}
            title="Выбрать"
          >
            <Heart className="text-green-400" size={compact ? 16 : 20} />
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default ExpertCard;

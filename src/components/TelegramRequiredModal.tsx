import React from 'react';
import { Rivets } from './Rivets';

interface TelegramRequiredModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const TelegramRequiredModal: React.FC<TelegramRequiredModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOpenTelegram = () => {
    window.location.href = 'https://t.me/SAV_AIbot/app';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-[90%] max-w-md mx-4 bg-background/95 backdrop-blur-md border border-primary/30 rounded-lg shadow-2xl overflow-hidden">
        {/* Decorative gears */}
        <div className="absolute -top-8 -right-8 w-24 h-24 opacity-20">
          <i className="fa-solid fa-gear text-primary text-6xl animate-spin" style={{ animationDuration: '8s' }}></i>
        </div>
        <div className="absolute -bottom-6 -left-6 w-16 h-16 opacity-15">
          <i className="fa-solid fa-gear text-secondary text-4xl animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}></i>
        </div>
        
        <Rivets />
        
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors z-10"
          >
            <i className="fa-solid fa-times text-lg"></i>
          </button>
        )}
        
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center border-b border-foreground/10">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/40">
            <i className="fa-brands fa-telegram text-4xl text-primary"></i>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Требуется Telegram
          </h2>
          <p className="text-sm text-foreground/60">
            Механический вход через паровую телеграфию
          </p>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6 text-center">
          <p className="text-foreground/80 mb-6 leading-relaxed">
            Для доступа к этой функции <span className="text-primary font-semibold">SAV AI</span> необходимо 
            открыть приложение через официального Telegram-бота.
          </p>
          
          <div className="bg-black/30 rounded-lg p-4 mb-6 border border-foreground/10">
            <div className="flex items-center justify-center gap-2 text-xs text-foreground/50 mb-2">
              <i className="fa-solid fa-info-circle"></i>
              <span>Инструкция</span>
            </div>
            <ol className="text-sm text-foreground/70 text-left space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Откройте Telegram на вашем устройстве</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Перейдите к боту @SAV_AIbot</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Нажмите кнопку меню для запуска</span>
              </li>
            </ol>
          </div>
          
          <button
            onClick={handleOpenTelegram}
            className="w-full py-4 px-6 bg-[#0088cc] hover:bg-[#0099dd] text-white font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <i className="fa-brands fa-telegram text-xl"></i>
            <span>Открыть в Telegram</span>
            <i className="fa-solid fa-arrow-right text-sm"></i>
          </button>
        </div>
        
        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-[10px] text-foreground/30 uppercase tracking-widest">
            SAV AI • Паровая Телеграфия
          </p>
        </div>
      </div>
    </div>
  );
};

export default TelegramRequiredModal;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Rivets from './Rivets';
 import { Users } from 'lucide-react';

interface IntroStepProps {
  inputValue?: string;
  setInputValue?: (value: string) => void;
  onClassify?: () => void;
  onCalculator?: () => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({
  inputValue,
  setInputValue,
  onClassify,
  onCalculator,
}) => {
  const navigate = useNavigate();

  const handleAISeller = () => {
    if (onClassify) {
      onClassify();
    } else {
      navigate('/ai-seller');
    }
  };

  const handleCalculator = () => {
    if (onCalculator) {
      onCalculator();
    } else {
      navigate('/calculator');
    }
  };

  return (
    <div className="steam-fade space-y-5">
      <div className="steampunk-border p-5 md:p-10">
        <Rivets />
        <h2 className="text-2xl md:text-4xl mb-3 text-center sm:text-left">Ваш Запрос в Канцелярию</h2>
        <p className="text-sm md:text-lg leading-relaxed mb-6 italic opacity-80">
          Приветствую! Я ваш механический секретарь SAV AI! 🎩 Опишите род вашей деятельности, 
          и мои шестерни мгновенно определят сегмент и сферу вашего предприятия.
        </p>
        <div className="space-y-5">
          {setInputValue && (
            <textarea
              className="glass-input w-full p-4 rounded-xl outline-none transition-all h-28 md:h-32 text-sm md:text-lg shadow-inner"
              placeholder="Опишите ваше дело... (например: мастерская по починке дирижаблей)"
              value={inputValue || ''}
              onChange={(e) => setInputValue(e.target.value)}
            />
          )}
          <div className="space-y-2">
            <button 
              onClick={handleAISeller}
              className="steampunk-button w-full py-3.5 text-lg md:text-2xl"
            >
              <i className="fa-solid fa-robot"></i> ИИ-Продавец
            </button>
            <p className="text-xs md:text-sm text-center opacity-50 italic">
              Готовые тарифы для отдела продаж • Быстрый подбор пакета
            </p>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
            <span className="text-primary text-[10px] md:text-sm italic opacity-40 uppercase tracking-widest">или</span>
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
          </div>

          <div className="space-y-2">
            <button 
              onClick={handleCalculator}
              className="w-full bg-transparent border border-foreground/10 text-primary py-3 text-base md:text-lg hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 rounded-xl backdrop-blur-sm"
            >
              <i className="fa-solid fa-users-cog"></i> ИИ для других отделов
            </button>
            <p className="text-xs md:text-sm text-center opacity-50 italic">
              Индивидуальный расчёт по ТЗ • Любые сотрудники и отделы
            </p>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
            <span className="text-accent text-[10px] md:text-sm italic opacity-40 uppercase tracking-widest">бесплатно</span>
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => navigate('/experts')}
              className="w-full bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 text-accent py-3 text-base md:text-lg hover:from-accent/30 hover:to-primary/30 transition-all flex items-center justify-center gap-2 rounded-xl backdrop-blur-sm"
            >
              <Users className="w-5 h-5" /> Бесплатный аудит Экспертом
            </button>
            <p className="text-xs md:text-sm text-center opacity-50 italic">
              Консультация с экспертом • Без обязательств
            </p>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
            <span className="text-primary text-[10px] md:text-sm italic opacity-40 uppercase tracking-widest">партнёрам</span>
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
          </div>

          <div className="space-y-2">
            <a
              href="https://t.me/SAVPartnerBot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 py-3 text-base md:text-lg hover:from-green-500/30 hover:to-emerald-500/30 transition-all flex items-center justify-center gap-2 rounded-xl backdrop-blur-sm"
            >
              <i className="fa-solid fa-handshake"></i> ИИ-Гренландия
            </a>
            <p className="text-xs md:text-sm text-center opacity-50 italic">
              Регистрация партнёров и экспертов
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroStep;

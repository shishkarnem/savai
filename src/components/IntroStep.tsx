import React from 'react';
import Rivets from './Rivets';

interface IntroStepProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  onClassify: () => void;
  onCalculator: () => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({
  inputValue,
  setInputValue,
  onClassify,
  onCalculator,
}) => {
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
          <textarea
            className="glass-input w-full p-4 rounded-xl outline-none transition-all h-28 md:h-32 text-sm md:text-lg shadow-inner"
            placeholder="Опишите ваше дело... (например: мастерская по починке дирижаблей)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button 
            onClick={onClassify}
            className="steampunk-button w-full py-3.5 text-lg md:text-2xl"
          >
            <i className="fa-solid fa-gauge-high"></i> Проанализировать
          </button>

          <div className="flex items-center gap-4 py-1">
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
            <span className="text-primary text-[10px] md:text-sm italic opacity-40 uppercase tracking-widest">или воспользуйтесь</span>
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
          </div>

          <button 
            onClick={onCalculator}
            className="w-full bg-transparent border border-foreground/10 text-primary py-2.5 text-base md:text-lg hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 rounded-xl backdrop-blur-sm"
          >
            <i className="fa-solid fa-calculator"></i> Калькулятором затрат
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroStep;

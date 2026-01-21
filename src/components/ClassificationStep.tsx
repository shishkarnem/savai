import React from 'react';
import { BusinessInfo } from '../types';
import Rivets from './Rivets';

interface ClassificationStepProps {
  businessInfo: BusinessInfo;
  onShowPrices: () => void;
  onBack: () => void;
}

export const ClassificationStep: React.FC<ClassificationStepProps> = ({
  businessInfo,
  onShowPrices,
  onBack,
}) => {
  return (
    <div className="steam-fade space-y-5">
      <div className="steampunk-border p-5 md:p-10 relative overflow-hidden">
        <Rivets />
        <div className="absolute top-0 right-0 p-2.5 bg-primary/70 text-background font-bold text-[9px] md:text-[10px] rounded-bl-xl uppercase tracking-tighter">
          АРХИВ №2025
        </div>
        
        <div className="mb-6 text-foreground italic leading-relaxed text-xs md:text-base border-l-2 border-primary pl-4 md:pl-6 bg-foreground/5 py-4 rounded-r-xl">
          {businessInfo.praise}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-4 mb-6">
          {['Секция', 'Категория', 'Отрасль'].map((label, i) => {
            const vals = [businessInfo.segment, businessInfo.category, businessInfo.sphere];
            return (
              <div key={i} className="p-2.5 md:p-4 bg-foreground/5 border border-foreground/5 rounded-xl text-center backdrop-blur-lg">
                <div className="text-[9px] md:text-[10px] text-primary uppercase mb-1 opacity-50">{label}</div>
                <div className="text-sm md:text-xl font-bold">{vals[i]}</div>
              </div>
            );
          })}
        </div>

        <div className="p-4 md:p-6 bg-foreground/5 border border-dashed border-primary/20 rounded-2xl text-center mb-6">
          <h3 className="text-lg md:text-2xl mb-1.5 text-primary">
            Индивидуальное решение: {businessInfo.package || 'SAV AI'}
          </h3>
          <p className="text-[10px] md:text-xs italic opacity-50">Механизмы классифицированы. Начинаем расчет цен?</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onShowPrices}
            className="steampunk-button flex-1 py-3.5 text-base md:text-xl"
          >
            <i className="fa-solid fa-scroll"></i> Показать тарифы
          </button>
          <button 
            onClick={onBack}
            className="border border-foreground/10 text-primary hover:bg-foreground/5 py-3 px-6 transition-all text-[11px] md:text-sm uppercase font-bold rounded-xl backdrop-blur-md"
          >
            Скорректировать
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassificationStep;

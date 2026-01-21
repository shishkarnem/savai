import React from 'react';
import { PlanData, PlanLevel, BusinessInfo } from '../types';
import { FALLBACK_PLANS, INTEGRATIONS_LIST } from '../constants';
import Rivets from './Rivets';

interface PlanDetailsStepProps {
  selectedPlan: PlanLevel;
  planDetails: { data: PlanData | null; presentation: string };
  businessInfo: BusinessInfo;
  onBack: () => void;
  onExpert: () => void;
  onCalculator: () => void;
}

export const PlanDetailsStep: React.FC<PlanDetailsStepProps> = ({
  selectedPlan,
  planDetails,
  onBack,
  onExpert,
  onCalculator,
}) => {
  return (
    <div className="steam-fade space-y-5 pb-10">
      <div className="steampunk-border p-5 md:p-10">
        <Rivets />
        <div className="flex justify-between items-center mb-6 border-b border-foreground/10 pb-4">
          <h2 className="text-2xl md:text-5xl text-primary">{selectedPlan}</h2>
          <button 
            onClick={onBack} 
            className="text-primary underline text-xs md:text-base opacity-60 hover:opacity-100 transition-opacity"
          >
            К списку
          </button>
        </div>

        <div className="mb-8">
          <h3 className="text-lg md:text-xl mb-3 opacity-90 text-primary">Спецификация Механизма:</h3>
          {planDetails.data?.photoUrl && (
            <img 
              src={planDetails.data.photoUrl} 
              alt="Plan" 
              className="w-full h-40 md:h-80 object-cover rounded-2xl border border-foreground/10 mb-6 grayscale brightness-90 hover:grayscale-0 transition-all duration-700 shadow-2xl" 
            />
          )}
          <div className="bg-foreground/5 p-4 md:p-6 border border-foreground/5 rounded-2xl whitespace-pre-wrap leading-relaxed text-xs md:text-base italic mb-6 backdrop-blur-2xl">
            {planDetails.data?.fullDescription || FALLBACK_PLANS.find(p => p.package === selectedPlan)?.fullDescription}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg md:text-xl mb-3 opacity-90 text-primary">Демонстрация Возможностей:</h3>
          <div className="bg-black/20 p-4 rounded-xl prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-[10px] md:text-sm opacity-70">
            {planDetails.presentation}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="p-4 md:p-6 bg-foreground/5 border border-foreground/5 rounded-2xl backdrop-blur-lg">
            <h4 className="text-primary mb-3 uppercase font-bold text-[10px] md:text-xs opacity-70">Энергоблоки (Токены):</h4>
            <ul className="space-y-1.5 text-[10px] md:text-xs opacity-60">
              <li>⚙️ 10 млн. = 600 руб.</li>
              <li>⚙️ 50 млн. = 3 000 руб.</li>
              <li>⚙️ 200 млн. = 12 000 руб.</li>
              <li>⚙️ 400 млн. = 24 000 руб.</li>
            </ul>
          </div>
          <div className="p-4 md:p-6 bg-foreground/5 border border-foreground/5 rounded-2xl backdrop-blur-lg">
            <h4 className="text-primary mb-3 uppercase font-bold text-[10px] md:text-xs opacity-70">Узлы Связи:</h4>
            <div className="h-32 overflow-y-auto text-[9px] md:text-xs space-y-1 pr-2">
              {INTEGRATIONS_LIST.split('\n').map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onExpert}
            className="steampunk-button w-full py-4 text-lg md:text-2xl"
          >
            Запустить Производство
          </button>
          <button 
            onClick={onCalculator}
            className="border border-foreground/10 text-primary w-full py-3 text-sm md:text-base hover:bg-foreground/5 transition-all rounded-xl backdrop-blur-md"
          >
            Пересчитать на калькуляторе
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanDetailsStep;

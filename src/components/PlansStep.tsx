import React from 'react';
import { PlanData, PlanLevel } from '../types';
import { FALLBACK_PLANS } from '../constants';
import Rivets from './Rivets';

interface PlansStepProps {
  plans: PlanData[];
  onSelectPlan: (level: PlanLevel) => void;
  onExpert: () => void;
  onCalculator: () => void;
}

export const PlansStep: React.FC<PlansStepProps> = ({
  plans,
  onSelectPlan,
  onExpert,
  onCalculator,
}) => {
  const displayPlans = plans.length > 0 ? plans : FALLBACK_PLANS;

  return (
    <div className="steam-fade space-y-5">
      <h2 className="text-3xl md:text-5xl text-center mb-8 text-primary">Каталог Решений</h2>
      
      <div className="bg-foreground/5 backdrop-blur-xl p-3.5 border-l-2 border-primary rounded-r-xl mb-6 italic text-[11px] md:text-sm">
        <p className="opacity-70">Выберите конфигурацию, наиболее пригодную для вашей мануфактуры.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {displayPlans.map((p, idx) => (
          <div 
            key={idx} 
            className="steampunk-border p-5 flex flex-col h-full hover:scale-[1.03] transition-transform cursor-pointer group"
            onClick={() => onSelectPlan(p.package as PlanLevel)}
          >
            <Rivets />
            <div className="text-xl md:text-2xl text-primary mb-3 border-b border-foreground/5 pb-2 font-bold">
              {p.package}
            </div>
            <div className="text-[11px] md:text-xs opacity-60 mb-5 flex-1 whitespace-pre-wrap leading-relaxed">
              {p.fullDescription?.substring(0, 160)}...
            </div>
            <div className="text-xl md:text-3xl font-bold mb-5 text-center text-primary drop-shadow-lg">
              {p.priceMonth ? `${p.priceMonth} ₽` : 'По запросу'}
            </div>
            <button className="steampunk-button w-full py-2.5 text-xs">Изучить чертеж</button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button 
          onClick={onExpert}
          className="steampunk-button px-6 md:px-10 py-3.5 text-base md:text-lg"
        >
          <i className="fa-solid fa-user-gear"></i> Аудит Экспертом
        </button>
        <button 
          onClick={onCalculator}
          className="border border-foreground/10 text-primary px-6 md:px-10 py-3.5 text-base md:text-lg hover:bg-foreground/5 transition-all rounded-xl backdrop-blur-md"
        >
          Точный расчет
        </button>
      </div>
    </div>
  );
};

export default PlansStep;

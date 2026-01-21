import React from 'react';
import Rivets from './Rivets';

interface CalculatorStepProps {
  hasBusinessInfo: boolean;
  onBack: () => void;
}

const CALC_URL = `https://docs.google.com/forms/d/e/1FAIpQLSdSARiTa4zYB-sYseymb3Q0C1Y_dBh8oDLavON_2mTu8o574w/viewform?embedded=true&usp=pp_url&entry.2102663603=%D0%A1%D0%B0%D0%B2%D0%B2%D0%B0`;

export const CalculatorStep: React.FC<CalculatorStepProps> = ({
  hasBusinessInfo,
  onBack,
}) => {
  return (
    <div className="steam-fade space-y-5 w-full">
      <div className="flex justify-between items-center border-b border-foreground/10 pb-3 mb-6">
        <h2 className="text-xl md:text-4xl text-primary">Аналитический Блок</h2>
        <button 
          onClick={onBack}
          className="text-primary underline text-xs md:text-base opacity-70 hover:opacity-100 transition-opacity"
        >
          Вернуться
        </button>
      </div>
      
      <div className="steampunk-border overflow-hidden w-full relative" style={{ minHeight: '550px' }}>
        <Rivets />
        <iframe 
          src={CALC_URL} 
          width="100%" 
          height="1400" 
          frameBorder="0" 
          marginHeight={0} 
          marginWidth={0}
          className="w-full grayscale brightness-75 hover:grayscale-0 transition-all duration-1000 opacity-80"
          style={{ background: 'transparent' }}
          title="Calculator Google Form"
        >
          Загрузка механизма…
        </iframe>
      </div>
    </div>
  );
};

export default CalculatorStep;

import React from 'react';

interface ExpertStepProps {
  onRestart: () => void;
}

export const ExpertStep: React.FC<ExpertStepProps> = ({ onRestart }) => {
  return (
    <div className="steam-fade text-center space-y-6 py-10 md:py-16">
      <div className="relative inline-block p-6 md:p-8 bg-foreground/5 rounded-full backdrop-blur-2xl border border-foreground/10 shadow-2xl">
        <i className="fa-solid fa-user-tie text-7xl md:text-9xl text-primary drop-shadow-2xl"></i>
        <i className="fa-solid fa-cog gear text-3xl md:text-5xl absolute -bottom-2 -right-2 opacity-30"></i>
      </div>
      <h2 className="text-4xl md:text-6xl text-primary">Сигнал Принят!</h2>
      <p className="text-base md:text-xl max-w-xl mx-auto leading-relaxed italic opacity-70">
        Ваше сообщение доставлено в центральный узел SAV AI. 
        Наш главный механик подготовит чертежи аудита для вашего предприятия в кратчайшие сроки.
      </p>
      <button 
        onClick={onRestart}
        className="steampunk-button px-10 md:px-14 py-4 text-base md:text-lg mx-auto"
      >
        Новый Заказ
      </button>
    </div>
  );
};

export default ExpertStep;

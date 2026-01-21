import React from 'react';

export const ProcessingLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center z-[60]">
      <div className="relative mb-6">
        <i className="fa-solid fa-gear text-6xl text-secondary animate-spin"></i>
        <i 
          className="fa-solid fa-gear text-4xl text-primary animate-spin absolute -top-4 -right-4" 
          style={{ animationDirection: 'reverse' }}
        ></i>
      </div>
      <h2 className="steampunk-header text-2xl text-primary animate-pulse">Обработка данных...</h2>
      <p className="mt-2 text-foreground italic text-sm">Механизмы в движении</p>
    </div>
  );
};

export default ProcessingLoader;

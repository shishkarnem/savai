import React from 'react';

interface BootLoaderProps {
  bootProgress: number;
  bootStatus: string;
}

export const BootLoader: React.FC<BootLoaderProps> = ({ bootProgress, bootStatus }) => {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100] p-6 text-center">
      <div className="relative mb-12">
        <i className="fa-solid fa-gear text-8xl md:text-9xl text-secondary animate-spin"></i>
        <i 
          className="fa-solid fa-gear text-5xl md:text-6xl text-primary animate-spin absolute -top-6 -right-6" 
          style={{ animationDirection: 'reverse' }}
        ></i>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground drop-shadow-md">
          {bootProgress}%
        </div>
      </div>
      <h2 className="steampunk-header text-3xl md:text-5xl mb-4 text-primary animate-pulse uppercase tracking-widest">
        СИНХРОНИЗАЦИЯ
      </h2>
      <p className="text-foreground italic text-lg md:text-xl tracking-widest opacity-80 mb-8 font-serif">
        {bootStatus}
      </p>
      
      <div className="w-full max-w-md h-3 bg-black/40 rounded-full overflow-hidden border border-primary/30 p-0.5">
        <div 
          className="h-full bg-gradient-to-r from-muted via-secondary to-primary transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.5)]" 
          style={{ width: `${bootProgress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default BootLoader;

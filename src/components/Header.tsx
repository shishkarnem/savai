import React from 'react';

interface HeaderProps {
  onLogoClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  return (
    <header 
      className="w-full max-w-6xl mb-6 flex justify-between items-center border-b border-foreground/10 pb-4 cursor-pointer" 
      onClick={onLogoClick}
    >
      <div className="flex items-center gap-3">
        <div className="relative group">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-black/40 backdrop-blur-md rounded-full border border-foreground/20 flex items-center justify-center text-xl md:text-2xl font-black text-primary shadow-lg">
            SAV
          </div>
          <i className="fa-solid fa-gear absolute -bottom-1 -right-1 text-xs md:text-sm text-secondary group-hover:rotate-180 transition-transform duration-1000"></i>
        </div>
        <div>
          <h1 className="text-xl md:text-3xl">ПРОДАВЕЦ</h1>
          <p className="text-primary text-[9px] md:text-[10px] italic tracking-widest uppercase opacity-60">
            Механический разум для коммерции
          </p>
        </div>
      </div>
      <div className="hidden sm:block text-right">
        <div className="text-[9px] font-bold opacity-40 uppercase">Манометр ИИ</div>
        <div className="text-primary font-bold opacity-70 text-xs">14.7 PSI</div>
      </div>
    </header>
  );
};

export default Header;

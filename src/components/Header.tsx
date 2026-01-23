import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

interface HeaderProps {
  onLogoClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  const navigate = useNavigate();
  const { profile, isTelegramWebApp } = useTelegramAuth();

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/profile');
  };

  return (
    <header className="w-full max-w-6xl mb-6 flex justify-between items-center border-b border-foreground/10 pb-4">
      {/* Logo - Left */}
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={onLogoClick}
      >
        <div className="relative group">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-black/40 backdrop-blur-md rounded-full border border-foreground/20 flex items-center justify-center text-xl md:text-2xl font-black text-primary shadow-lg">
            SAV
          </div>
          <i className="fa-solid fa-gear absolute -bottom-1 -right-1 text-xs md:text-sm text-secondary group-hover:rotate-180 transition-transform duration-1000"></i>
        </div>
        <div className="hidden sm:block">
          <h1 className="text-xl md:text-3xl">ПРОДАВЕЦ</h1>
          <p className="text-primary text-[9px] md:text-[10px] italic tracking-widest uppercase opacity-60">
            Механический разум для коммерции
          </p>
        </div>
      </div>

      {/* Profile - Center */}
      {isTelegramWebApp && profile && (
        <button
          onClick={handleProfileClick}
          className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-md rounded-full border border-foreground/20 hover:border-primary/50 hover:bg-black/50 transition-all duration-300 group"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/40 bg-black/40">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className="fa-solid fa-user text-primary/60 text-sm"></i>
              </div>
            )}
          </div>
          <span className="text-sm text-foreground/80 group-hover:text-primary transition-colors hidden md:inline">
            {profile.first_name || 'Профиль'}
          </span>
          <i className="fa-solid fa-chevron-right text-xs text-foreground/40 group-hover:text-primary transition-colors"></i>
        </button>
      )}

      {/* Pressure Gauge - Right */}
      <div className="hidden sm:block text-right">
        <div className="text-[9px] font-bold opacity-40 uppercase">Манометр ИИ</div>
        <div className="text-primary font-bold opacity-70 text-xs">14.7 PSI</div>
      </div>
    </header>
  );
};

export default Header;

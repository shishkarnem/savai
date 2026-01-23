import React from 'react';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

export const DevModeToggle: React.FC = () => {
  const { isDevMode, toggleDevMode } = useTelegramAuth();

  // Only show in Lovable preview
  const isLovablePreview = typeof window !== 'undefined' && (
    window.location.hostname.includes('lovable.app') ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname === '127.0.0.1'
  );

  if (!isLovablePreview) return null;

  return (
    <button
      onClick={toggleDevMode}
      className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-300 border shadow-lg ${
        isDevMode
          ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
          : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
      }`}
      title={isDevMode ? 'Dev Mode ON - кликните для тестирования production' : 'Production Mode - кликните для dev режима'}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isDevMode ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
        <span>{isDevMode ? 'DEV' : 'PROD'}</span>
      </div>
    </button>
  );
};

export default DevModeToggle;

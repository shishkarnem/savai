import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramProfile {
  id: string;
  telegram_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

// Extend Window interface for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}

interface TelegramAuthContextType {
  telegramUser: TelegramUser | null;
  profile: TelegramProfile | null;
  isLoading: boolean;
  isNewUser: boolean;
  isTelegramWebApp: boolean;
  error: string | null;
}

const TelegramAuthContext = createContext<TelegramAuthContextType | undefined>(undefined);

// Check if running in Lovable preview/editor
// Preview domains can be lovable.app OR lovableproject.com
const isLovablePreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname.includes('localhost') ||
  window.location.hostname === '127.0.0.1'
);

// Get dev mode from localStorage
const getDevMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('sav-dev-mode');
  if (stored !== null) return stored === 'true';
  return isLovablePreview;
};

// Mock dev user profile
const DEV_USER_PROFILE: TelegramProfile = {
  id: 'dev-mode-id',
  telegram_id: 123456789,
  first_name: 'Разработчик',
  last_name: 'SAV',
  username: 'sav_developer',
  photo_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sav-dev&backgroundColor=c4a052',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const TelegramAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [profile, setProfile] = useState<TelegramProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTelegramWebApp = typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
  const isDevMode = isLovablePreview && getDevMode() && !isTelegramWebApp;

  useEffect(() => {
    const initTelegramAuth = async () => {
      // If in dev mode (Lovable preview with dev mode enabled), use mock profile
      if (isDevMode) {
        console.log('🔧 Running in DEV MODE - using test profile');
        setProfile(DEV_USER_PROFILE);
        setTelegramUser({
          id: DEV_USER_PROFILE.telegram_id,
          first_name: DEV_USER_PROFILE.first_name || undefined,
          last_name: DEV_USER_PROFILE.last_name || undefined,
          username: DEV_USER_PROFILE.username || undefined,
          photo_url: DEV_USER_PROFILE.photo_url || undefined,
        });
        setIsLoading(false);
        return;
      }

      // Check if running inside Telegram WebApp
      if (!window.Telegram?.WebApp) {
        console.log('Not running in Telegram WebApp');
        setIsLoading(false);
        return;
      }

      const tgWebApp = window.Telegram.WebApp;
      
      // Notify Telegram that the app is ready
      tgWebApp.ready();
      
      // Expand to full height
      tgWebApp.expand();

      const user = tgWebApp.initDataUnsafe.user;
      
      if (!user) {
        console.log('No Telegram user data available');
        setIsLoading(false);
        return;
      }

      setTelegramUser(user);
      console.log('Telegram user detected:', user);

      try {
        // Register or update user in database
        const { data, error: fnError } = await supabase.functions.invoke('telegram-auth', {
          body: { telegramUser: user }
        });

        if (fnError) {
          console.error('Error calling telegram-auth function:', fnError);
          setError('Ошибка авторизации');
          setIsLoading(false);
          return;
        }

        if (data?.success) {
          setProfile(data.profile);
          setIsNewUser(data.isNewUser);
          console.log('Telegram auth successful:', data.isNewUser ? 'new user' : 'existing user');
        } else {
          setError(data?.error || 'Неизвестная ошибка');
        }
      } catch (err) {
        console.error('Error during Telegram auth:', err);
        setError('Ошибка подключения к серверу');
      } finally {
        setIsLoading(false);
      }
    };

    initTelegramAuth();
  }, [isDevMode]);

  const value: TelegramAuthContextType = {
    telegramUser,
    profile,
    isLoading,
    isNewUser,
    isTelegramWebApp: isTelegramWebApp || isDevMode,
    error,
  };

  return (
    <TelegramAuthContext.Provider value={value}>
      {children}
    </TelegramAuthContext.Provider>
  );
};

export const useTelegramAuth = (): TelegramAuthContextType => {
  const context = useContext(TelegramAuthContext);
  if (context === undefined) {
    throw new Error('useTelegramAuth must be used within a TelegramAuthProvider');
  }
  return context;
};

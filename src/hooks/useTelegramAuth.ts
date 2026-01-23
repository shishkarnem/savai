import { useEffect, useState, useCallback } from 'react';
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

interface UseTelegramAuthResult {
  telegramUser: TelegramUser | null;
  profile: TelegramProfile | null;
  isLoading: boolean;
  isNewUser: boolean;
  isTelegramWebApp: boolean;
  error: string | null;
  isDevMode: boolean;
  toggleDevMode: () => void;
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
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
      };
    };
  }
}

// Check if running in Lovable preview/editor
const isLovablePreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('localhost') ||
  window.location.hostname === '127.0.0.1'
);

// Get initial dev mode state from localStorage (default to true in Lovable preview)
const getInitialDevMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('sav-dev-mode');
  if (stored !== null) return stored === 'true';
  return isLovablePreview; // Default to true if in Lovable
};

export const useTelegramAuth = (): UseTelegramAuthResult => {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [profile, setProfile] = useState<TelegramProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devModeEnabled, setDevModeEnabled] = useState<boolean>(getInitialDevMode);

  const isTelegramWebApp = typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
  
  // Dev mode is only available in Lovable preview and when enabled
  const isDevMode = isLovablePreview && devModeEnabled && !isTelegramWebApp;

  const toggleDevMode = useCallback(() => {
    setDevModeEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('sav-dev-mode', String(newValue));
      // Reload to apply changes
      window.location.reload();
      return newValue;
    });
  }, []);

  useEffect(() => {
    const initTelegramAuth = async () => {
      // If in dev mode (Lovable preview), create mock profile
      if (isDevMode) {
        console.log('Running in Lovable preview - using dev mode');
        setProfile({
          id: 'dev-mode-id',
          telegram_id: 123456789,
          first_name: 'Dev',
          last_name: 'Mode',
          username: 'dev_user',
          photo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

  return {
    telegramUser,
    profile,
    isLoading,
    isNewUser,
    isTelegramWebApp: isTelegramWebApp || isDevMode, // Treat dev mode as if in Telegram
    error,
    isDevMode: devModeEnabled && isLovablePreview,
    toggleDevMode,
  };
};

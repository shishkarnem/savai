import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';

export type CRMAccessLevel = 'viewer' | 'editor' | 'admin' | null;

interface CRMAccessState {
  isLoading: boolean;
  hasAccess: boolean;
  accessLevel: CRMAccessLevel;
  isDevMode: boolean;
}

// Check if running in Lovable preview/editor
const isLovablePreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

// Get dev mode from localStorage
const getDevMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('sav-dev-mode');
  if (stored !== null) return stored === 'true';
  return isLovablePreview;
};

export function useCRMAccess(): CRMAccessState {
  const { profile, isLoading: authLoading, isTelegramWebApp } = useTelegramAuth();
  const [accessLevel, setAccessLevel] = useState<CRMAccessLevel>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDevMode = isLovablePreview && getDevMode();

  useEffect(() => {
    const checkAccess = async () => {
      // Dev mode in Lovable editor - full access
      if (isDevMode) {
        setAccessLevel('admin');
        setIsLoading(false);
        return;
      }

      // Wait for auth to complete
      if (authLoading) return;

      // No Telegram profile - no access
      if (!profile?.telegram_id) {
        setAccessLevel(null);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user is in crm_admins table
        const { data, error } = await supabase
          .from('crm_admins')
          .select('access_level')
          .eq('telegram_id', profile.telegram_id)
          .single();

        if (error || !data) {
          setAccessLevel(null);
        } else {
          setAccessLevel(data.access_level as CRMAccessLevel);
        }
      } catch (err) {
        console.error('Error checking CRM access:', err);
        setAccessLevel(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [profile, authLoading, isDevMode]);

  return {
    isLoading: isLoading || authLoading,
    hasAccess: accessLevel !== null,
    accessLevel,
    isDevMode,
  };
}

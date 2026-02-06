import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import type { Json } from '@/integrations/supabase/types';

/**
 * Hook for tracking user actions in Calculator and AI-Seller flows.
 * Accumulates actions in a session and saves/updates them in user_calculations.
 */
export function useActionTracker(flowType: 'calculator' | 'ai_seller') {
  const { profile } = useTelegramAuth();
  const sessionIdRef = useRef<string | null>(null);
  const actionsRef = useRef<Array<Record<string, string>>>([]);

  const telegramId = profile?.telegram_id;

  /**
   * Track a single action (page visit, field change, button click)
   */
  const trackAction = useCallback(async (
    action: string,
    details?: { page?: string; field?: string; value?: string; data?: Record<string, Json> }
  ) => {
    if (!telegramId) return;

    const entry: Record<string, string> = {
      action,
      timestamp: new Date().toISOString(),
    };
    if (details?.page) entry.page = details.page;
    if (details?.field) entry.field = details.field;
    if (details?.value) entry.value = details.value;

    actionsRef.current = [...actionsRef.current, entry];

    const sessionData: Record<string, Json> = {
      ...(details?.data || {}),
      actions: actionsRef.current as unknown as Json,
      lastAction: action,
      lastUpdated: new Date().toISOString(),
    };

    try {
      if (sessionIdRef.current) {
        await supabase
          .from('user_calculations')
          .update({ data: sessionData as Json })
          .eq('id', sessionIdRef.current);
      } else {
        const insertData: Record<string, Json> = {
          ...sessionData,
          startedAt: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('user_calculations')
          .insert([{
            telegram_id: telegramId,
            calculation_type: flowType,
            data: insertData as Json,
          }])
          .select('id')
          .single();

        if (!error && data) {
          sessionIdRef.current = data.id;
        }
      }
    } catch (err) {
      console.error('Error tracking action:', err);
    }
  }, [telegramId, flowType]);

  /**
   * Save current session state with form data
   */
  const saveSessionData = useCallback(async (formData: Record<string, Json>) => {
    if (!telegramId) return;

    const sessionData: Record<string, Json> = {
      ...formData,
      actions: actionsRef.current as unknown as Json,
      lastUpdated: new Date().toISOString(),
    };

    try {
      if (sessionIdRef.current) {
        await supabase
          .from('user_calculations')
          .update({ data: sessionData as Json })
          .eq('id', sessionIdRef.current);
      } else {
        const insertData: Record<string, Json> = {
          ...sessionData,
          startedAt: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('user_calculations')
          .insert([{
            telegram_id: telegramId,
            calculation_type: flowType,
            data: insertData as Json,
          }])
          .select('id')
          .single();

        if (!error && data) {
          sessionIdRef.current = data.id;
        }
      }
    } catch (err) {
      console.error('Error saving session data:', err);
    }
  }, [telegramId, flowType]);

  /**
   * Reset session (for new flow)
   */
  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    actionsRef.current = [];
  }, []);

  return { trackAction, saveSessionData, resetSession };
}

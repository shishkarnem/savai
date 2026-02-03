import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sav-viewed-experts';

interface ViewedExpert {
  id: string;
  direction: 'left' | 'right' | 'down';
  timestamp: number;
}

export const useViewedExperts = () => {
  const [viewedExperts, setViewedExperts] = useState<Map<string, ViewedExpert>>(new Map());

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ViewedExpert[] = JSON.parse(stored);
        const map = new Map<string, ViewedExpert>();
        parsed.forEach(item => map.set(item.id, item));
        setViewedExperts(map);
      }
    } catch (e) {
      console.error('Error loading viewed experts:', e);
    }
  }, []);

  // Persist to localStorage when changed
  const saveToStorage = useCallback((map: Map<string, ViewedExpert>) => {
    try {
      const arr = Array.from(map.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error('Error saving viewed experts:', e);
    }
  }, []);

  const markAsViewed = useCallback((expertId: string, direction: 'left' | 'right' | 'down') => {
    setViewedExperts(prev => {
      const next = new Map(prev);
      next.set(expertId, {
        id: expertId,
        direction,
        timestamp: Date.now(),
      });
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  const updateDirection = useCallback((expertId: string, direction: 'left' | 'right' | 'down') => {
    setViewedExperts(prev => {
      const existing = prev.get(expertId);
      if (!existing) return prev;
      
      const next = new Map(prev);
      next.set(expertId, {
        ...existing,
        direction,
        timestamp: Date.now(),
      });
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  const isViewed = useCallback((expertId: string): boolean => {
    return viewedExperts.has(expertId);
  }, [viewedExperts]);

  const getViewedDirection = useCallback((expertId: string): 'left' | 'right' | 'down' | null => {
    return viewedExperts.get(expertId)?.direction ?? null;
  }, [viewedExperts]);

  const clearViewed = useCallback(() => {
    setViewedExperts(new Map());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getAllViewed = useCallback(() => {
    return Array.from(viewedExperts.values());
  }, [viewedExperts]);

  return {
    viewedExperts,
    markAsViewed,
    updateDirection,
    isViewed,
    getViewedDirection,
    clearViewed,
    getAllViewed,
  };
};

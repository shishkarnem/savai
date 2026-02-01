import { useState, useEffect, useCallback, useRef } from 'react';

// This hook is now simplified - main logic moved to useRouteModel
// Keeping for backward compatibility with Index.tsx boot sequence

interface UseModelCacheReturn {
  isModelCached: boolean;
  isModelLoaded: boolean;
  bootProgress: number;
  bootStatus: string;
  markModelLoaded: () => void;
  startBooting: () => void;
  resetCache: () => void;
}

export const useModelCache = (): UseModelCacheReturn => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatus, setBootStatus] = useState('Инициализация котлов...');
  const listenersAttached = useRef(false);

  // Check if any model was previously loaded
  const checkCache = useCallback((): boolean => {
    try {
      // Check if bg-model-container is already active
      const container = document.getElementById('bg-model-container');
      if (container?.classList.contains('active')) {
        return true;
      }
      // Check localStorage for any cached model
      const keys = ['full', 'head', 'body', 'mini'];
      for (const key of keys) {
        const cached = localStorage.getItem(`sav_model_cache_${key}`);
        if (cached === 'loaded') {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const [isModelCached] = useState(checkCache);

  const markModelLoaded = useCallback(() => {
    setIsModelLoaded(true);
  }, []);

  const resetCache = useCallback(() => {
    try {
      const keys = ['full', 'head', 'body', 'mini'];
      for (const key of keys) {
        localStorage.removeItem(`sav_model_cache_${key}`);
        localStorage.removeItem(`sav_model_ts_${key}`);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const startBooting = useCallback(() => {
    setBootProgress(0);
    setBootStatus('Связь с сервером чертежей...');
  }, []);

  // Attach listeners for model loading (for boot animation)
  useEffect(() => {
    if (listenersAttached.current) return;
    
    const modelViewer = document.querySelector('#bg-model') as any;
    if (!modelViewer) return;

    const onProgress = (event: any) => {
      const progress = Math.round(event.detail.totalProgress * 100);
      setBootProgress(progress);
      
      if (progress > 30) setBootStatus('Смазка шестерней...');
      if (progress > 60) setBootStatus('Подача пара...');
      if (progress > 90) setBootStatus('Запуск поршней...');
    };

    const onLoad = () => {
      setBootProgress(100);
      setBootStatus('Механизм запущен!');
      markModelLoaded();
    };

    const onError = () => {
      setBootStatus('Ошибка! Механизм заклинило.');
      resetCache();
    };

    modelViewer.addEventListener('progress', onProgress);
    modelViewer.addEventListener('load', onLoad);
    modelViewer.addEventListener('error', onError);
    listenersAttached.current = true;

    return () => {
      modelViewer.removeEventListener('progress', onProgress);
      modelViewer.removeEventListener('load', onLoad);
      modelViewer.removeEventListener('error', onError);
      listenersAttached.current = false;
    };
  }, [markModelLoaded, resetCache]);

  return {
    isModelCached,
    isModelLoaded,
    bootProgress,
    bootStatus,
    markModelLoaded,
    startBooting,
    resetCache,
  };
};

export default useModelCache;

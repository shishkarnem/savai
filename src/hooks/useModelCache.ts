import { useState, useEffect, useCallback, useRef } from 'react';
import { getModelForRoute, MODEL_URLS } from './useRouteModel';

const MODEL_CACHE_KEY = 'sav_ai_model_loaded';
const MODEL_CACHE_TIMESTAMP_KEY = 'sav_ai_model_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface UseModelCacheReturn {
  isModelCached: boolean;
  isModelLoaded: boolean;
  bootProgress: number;
  bootStatus: string;
  markModelLoaded: () => void;
  startBooting: (source: string) => void;
  resetCache: () => void;
}

export const useModelCache = (defaultModelUrl: string): UseModelCacheReturn => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatus, setBootStatus] = useState('Инициализация котлов...');
  const listenersAttached = useRef(false);

  // Check if model was cached and cache is still valid
  const checkCache = useCallback((): boolean => {
    try {
      const cached = localStorage.getItem(MODEL_CACHE_KEY);
      const timestamp = localStorage.getItem(MODEL_CACHE_TIMESTAMP_KEY);
      
      if (cached === 'true' && timestamp) {
        const cacheTime = parseInt(timestamp, 10);
        const now = Date.now();
        if (now - cacheTime < CACHE_DURATION) {
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
    try {
      localStorage.setItem(MODEL_CACHE_KEY, 'true');
      localStorage.setItem(MODEL_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {
      // localStorage not available
    }
  }, []);

  const resetCache = useCallback(() => {
    try {
      localStorage.removeItem(MODEL_CACHE_KEY);
      localStorage.removeItem(MODEL_CACHE_TIMESTAMP_KEY);
    } catch {
      // localStorage not available
    }
  }, []);

  const startBooting = useCallback((source: string) => {
    setBootProgress(0);
    setBootStatus('Связь с сервером чертежей...');
    
    const modelViewer = document.querySelector('#bg-model') as any;
    if (modelViewer) {
      modelViewer.src = source;
    }
  }, []);

  // Attach listeners for model loading
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
      document.getElementById('bg-model-container')?.classList.add('active');
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

    // If cached, preload immediately
    if (isModelCached && !modelViewer.src) {
      modelViewer.src = defaultModelUrl;
    }

    return () => {
      modelViewer.removeEventListener('progress', onProgress);
      modelViewer.removeEventListener('load', onLoad);
      modelViewer.removeEventListener('error', onError);
      listenersAttached.current = false;
    };
  }, [isModelCached, defaultModelUrl, markModelLoaded, resetCache]);

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

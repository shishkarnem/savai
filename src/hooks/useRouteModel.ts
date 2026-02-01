import { useEffect, useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Cache key for storing loaded model URLs in localStorage
const MODEL_CACHE_PREFIX = 'sav_model_cache_';
const MODEL_CACHE_TIMESTAMP_PREFIX = 'sav_model_ts_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// 3D Model URLs for different page groups
export const MODEL_URLS = {
  // Робот в полный размер
  FULL_ROBOT: "https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQLJ1MGPTJ2Vxs9JjAnEQc6LxgNYmgDFSJoJjMfDDsZOjs8BBsmCzQ_JHppBnY7ByAOExIjbGYqJTkmVVpuYlYEbAV1VAgQCjEWKxseGVMpKyRYNBcXUm4FNwJgOi4UAQ4SOS4tKzsGCyUuTwJgBHdVAGB-S3U.glb",
  
  // Робот голова
  // Прямая выдача (без HTML/редиректов), корректно работает с model-viewer
  HEAD_ROBOT: "https://raw.githubusercontent.com/shishkarnem/savai/main/steampunk%20head.glb",
  
  // Робот тело
  BODY_ROBOT: "https://raw.githubusercontent.com/shishkarnem/savai/main/robot%20armor.glb",
  
  // Робот мини
  MINI_ROBOT: "https://raw.githubusercontent.com/shishkarnem/savai/main/Mini%20robot.glb",
} as const;

// Track which URLs have failed to load - fallback to FULL_ROBOT
const failedUrls = new Set<string>();

// Route to model mapping
const ROUTE_MODEL_MAP: Record<string, string> = {
  // Full robot pages
  '/': MODEL_URLS.FULL_ROBOT,
  '/profile': MODEL_URLS.FULL_ROBOT,
  '/calculator/step8': MODEL_URLS.FULL_ROBOT,
  '/experts': MODEL_URLS.FULL_ROBOT,
  '/experts/history': MODEL_URLS.FULL_ROBOT,
  
  // Head robot pages
  '/ai-seller': MODEL_URLS.HEAD_ROBOT,
  '/ai-seller/result': MODEL_URLS.HEAD_ROBOT,
  '/calculator': MODEL_URLS.HEAD_ROBOT,
  '/calculator/step1': MODEL_URLS.HEAD_ROBOT,
  '/calculator/step2': MODEL_URLS.HEAD_ROBOT,
  '/calculator/step3': MODEL_URLS.HEAD_ROBOT,
  '/calculator/step4': MODEL_URLS.HEAD_ROBOT,
  
  // Body robot pages
  '/ai-seller/plans': MODEL_URLS.BODY_ROBOT,
  '/ai-seller/plan': MODEL_URLS.BODY_ROBOT,
  '/calculator/step5': MODEL_URLS.BODY_ROBOT,
  '/calculator/step6': MODEL_URLS.BODY_ROBOT,
  '/calculator/step7': MODEL_URLS.BODY_ROBOT,
  
  // Mini robot pages (admin CRM)
  '/admin/crm': MODEL_URLS.MINI_ROBOT,
  '/admin/crm/dashboard': MODEL_URLS.MINI_ROBOT,
  '/admin/crm/admins': MODEL_URLS.MINI_ROBOT,
  '/admin/crm/messages': MODEL_URLS.MINI_ROBOT,
};

// Pattern-based route matching for dynamic routes
const ROUTE_PATTERNS: Array<{ pattern: RegExp; model: string }> = [
  // /profile/:telegramId
  { pattern: /^\/profile\/\d+$/, model: MODEL_URLS.FULL_ROBOT },
  // /ai-seller/plan/:planLevel
  { pattern: /^\/ai-seller\/plan\/[^/]+$/, model: MODEL_URLS.BODY_ROBOT },
];

// Get short key from URL for caching
const getModelKey = (url: string): string => {
  if (url === MODEL_URLS.FULL_ROBOT) return 'full';
  if (url === MODEL_URLS.HEAD_ROBOT) return 'head';
  if (url === MODEL_URLS.BODY_ROBOT) return 'body';
  if (url === MODEL_URLS.MINI_ROBOT) return 'mini';
  return 'unknown';
};

// Check if model is cached and valid
const isModelCached = (url: string): boolean => {
  try {
    const key = getModelKey(url);
    const cached = localStorage.getItem(MODEL_CACHE_PREFIX + key);
    const timestamp = localStorage.getItem(MODEL_CACHE_TIMESTAMP_PREFIX + key);
    
    if (cached === 'loaded' && timestamp) {
      const cacheTime = parseInt(timestamp, 10);
      return Date.now() - cacheTime < CACHE_DURATION;
    }
    return false;
  } catch {
    return false;
  }
};

// Mark model as cached
const markModelCached = (url: string): void => {
  try {
    const key = getModelKey(url);
    localStorage.setItem(MODEL_CACHE_PREFIX + key, 'loaded');
    localStorage.setItem(MODEL_CACHE_TIMESTAMP_PREFIX + key, Date.now().toString());
  } catch {
    // localStorage not available
  }
};

export const getModelForRoute = (pathname: string): string => {
  let targetModel: string;
  
  // First check exact matches
  if (ROUTE_MODEL_MAP[pathname]) {
    targetModel = ROUTE_MODEL_MAP[pathname];
  } else {
    // Then check pattern matches
    let found = false;
    for (const { pattern, model } of ROUTE_PATTERNS) {
      if (pattern.test(pathname)) {
        targetModel = model;
        found = true;
        break;
      }
    }
    
    if (!found) {
      targetModel = MODEL_URLS.FULL_ROBOT;
    }
  }
  
  // If this URL previously failed, use fallback
  if (failedUrls.has(targetModel!)) {
    console.log('[RouteModel] URL previously failed, using FULL_ROBOT fallback');
    return MODEL_URLS.FULL_ROBOT;
  }
  
  return targetModel!;
};

interface UseRouteModelReturn {
  currentModel: string;
  isLoading: boolean;
  loadProgress: number;
}

export const useRouteModel = (): UseRouteModelReturn => {
  const location = useLocation();
  const currentModelRef = useRef<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const listenersAttachedRef = useRef(false);
  const isTransitioningRef = useRef(false);

  // Load model with proper state management
  const loadModel = useCallback((url: string, isFirstLoad: boolean = false) => {
    const modelViewer = document.querySelector('#bg-model') as any;
    const container = document.getElementById('bg-model-container');
    
    if (!modelViewer) {
      console.warn('[RouteModel] model-viewer element not found');
      return;
    }

    // Check if this URL is already loaded
    if (modelViewer.src === url) {
      console.log('[RouteModel] Model already loaded:', getModelKey(url));
      return;
    }

    console.log('[RouteModel] Loading model:', getModelKey(url), isFirstLoad ? '(first load)' : '(transition)');
    
    if (isFirstLoad) {
      // First load - set src directly
      setIsLoading(true);
      setLoadProgress(0);
      modelViewer.src = url;
      currentModelRef.current = url;
    } else {
      // Transition - fade out first
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      
      if (container) {
        container.style.transition = 'opacity 0.3s ease-out';
        container.style.opacity = '0';
      }
      
      setTimeout(() => {
        setIsLoading(true);
        setLoadProgress(0);
        modelViewer.src = url;
        currentModelRef.current = url;
        isTransitioningRef.current = false;
      }, 300);
    }
  }, []);

  // Attach event listeners once
  useEffect(() => {
    if (listenersAttachedRef.current) return;
    
    const modelViewer = document.querySelector('#bg-model') as any;
    if (!modelViewer) return;

    const handleProgress = (event: any) => {
      const progress = Math.round(event.detail.totalProgress * 100);
      setLoadProgress(progress);
    };

    const handleLoad = () => {
      console.log('[RouteModel] Model loaded:', getModelKey(currentModelRef.current));
      setIsLoading(false);
      setLoadProgress(100);
      
      // Mark as cached
      if (currentModelRef.current) {
        markModelCached(currentModelRef.current);
      }
      
      // Fade in
      const container = document.getElementById('bg-model-container');
      if (container) {
        container.style.transition = 'opacity 0.5s ease-in';
        container.style.opacity = '0.6';
        container.classList.add('active');
      }
    };

    const handleError = (event: any) => {
      const failedUrl = currentModelRef.current;
      console.error('[RouteModel] Model load error:', event.detail?.message || 'Unknown error', 'URL:', getModelKey(failedUrl));
      
      // Mark URL as failed and fallback to FULL_ROBOT
      if (failedUrl && failedUrl !== MODEL_URLS.FULL_ROBOT) {
        failedUrls.add(failedUrl);
        console.log('[RouteModel] Falling back to FULL_ROBOT');
        
        // Try loading FULL_ROBOT instead
        const modelViewer = document.querySelector('#bg-model') as any;
        if (modelViewer) {
          modelViewer.src = MODEL_URLS.FULL_ROBOT;
          currentModelRef.current = MODEL_URLS.FULL_ROBOT;
        }
      } else {
        setIsLoading(false);
      }
    };

    modelViewer.addEventListener('progress', handleProgress);
    modelViewer.addEventListener('load', handleLoad);
    modelViewer.addEventListener('error', handleError);
    listenersAttachedRef.current = true;

    return () => {
      modelViewer.removeEventListener('progress', handleProgress);
      modelViewer.removeEventListener('load', handleLoad);
      modelViewer.removeEventListener('error', handleError);
      listenersAttachedRef.current = false;
    };
  }, []);

  // Handle route changes
  useEffect(() => {
    const targetModel = getModelForRoute(location.pathname);
    const modelViewer = document.querySelector('#bg-model') as any;
    
    if (!modelViewer) {
      // Wait for model-viewer to be ready
      const checkInterval = setInterval(() => {
        const mv = document.querySelector('#bg-model') as any;
        if (mv) {
          clearInterval(checkInterval);
          const target = getModelForRoute(location.pathname);
          loadModel(target, true);
        }
      }, 100);
      
      return () => clearInterval(checkInterval);
    }

    // Check if model needs to change
    const currentSrc = modelViewer.src;
    const isFirstLoad = !currentSrc || currentSrc === '' || currentSrc === window.location.href;
    
    if (isFirstLoad) {
      // First load - use the route-based model
      console.log('[RouteModel] First load for route:', location.pathname);
      loadModel(targetModel, true);
    } else if (currentModelRef.current !== targetModel) {
      // Route changed - transition to new model
      console.log('[RouteModel] Route change:', location.pathname, '-> model:', getModelKey(targetModel));
      loadModel(targetModel, false);
    }
  }, [location.pathname, loadModel]);

  return {
    currentModel: currentModelRef.current || getModelForRoute(location.pathname),
    isLoading,
    loadProgress,
  };
};

export default useRouteModel;

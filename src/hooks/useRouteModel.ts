import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// 3D Model URLs for different page groups
export const MODEL_URLS = {
  // Робот в полный размер
  FULL_ROBOT: "https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQLJ1MGPTJ2Vxs9JjAnEQc6LxgNYmgDFSJoJjMfDDsZOjs8BBsmCzQ_JHppBnY7ByAOExIjbGYqJTkmVVpuYlYEbAV1VAgQCjEWKxseGVMpKyRYNBcXUm4FNwJgOi4UAQ4SOS4tKzsGCyUuTwJgBHdVAGB-S3U.glb",
  
  // Робот голова
  HEAD_ROBOT: "https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQLKlMJFCwtLAsVAClzOAZYOxkSfRNyMjl0HgU9cTsZPCc0BBsmGDYlJH9sVi0TBhIpSCNODWYqJTkmVVpuYlYEbAV1VAgQCjEWKxseGVMpKyRYNBcXUm4FNwJgOi4UAQ4SOS4tKzsGCyUuTwJgBHdVAGB-S3U.glb",
  
  // Робот тело
  BODY_ROBOT: "https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQLLVMJFCwvCDkZPVEVGyVFOAUFZnR2B0xCBDItHDsZPDs0BBsmGDYlJH9sdnYzWTMlQTVJFWYqJTkmVVpuYlYEbAV1VAgQCjEWKxseGVMpKyRYNBcXUm4FNwJgOi4UAQ4SOS4tKzsGCyUuTwJgBHdVAGB-S3U.glb",
  
  // Робот мини
  MINI_ROBOT: "https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQLLFMJFCwoKwo-KUkvNRcvMjYQcDpzMzNZOiY3KjsZPD80BBsmGDYlJH8ycSUrVCIjMCAbFWYqJTkmVVpuYlYEbAV1VAgQCjEWKxseGVMpKyRYNBcXUm4FNwJgOi4UAQ4SOS4tKzsGCyUuTwJgBHdVAGB-S3U.glb",
} as const;

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

export const getModelForRoute = (pathname: string): string => {
  // First check exact matches
  if (ROUTE_MODEL_MAP[pathname]) {
    return ROUTE_MODEL_MAP[pathname];
  }
  
  // Then check pattern matches
  for (const { pattern, model } of ROUTE_PATTERNS) {
    if (pattern.test(pathname)) {
      return model;
    }
  }
  
  // Default to full robot
  return MODEL_URLS.FULL_ROBOT;
};

interface UseRouteModelReturn {
  currentModel: string;
  updateModel: (url: string) => void;
}

export const useRouteModel = (): UseRouteModelReturn => {
  const location = useLocation();
  const currentModelRef = useRef<string>('');
  
  const updateModel = useCallback((url: string) => {
    const modelViewer = document.querySelector('#bg-model') as any;
    if (modelViewer && modelViewer.src !== url) {
      // Fade out
      const container = document.getElementById('bg-model-container');
      if (container) {
        container.style.transition = 'opacity 0.3s ease-out';
        container.style.opacity = '0';
      }
      
      // Change model after fade
      setTimeout(() => {
        modelViewer.src = url;
        currentModelRef.current = url;
      }, 300);
    }
  }, []);

  // Update model on route change
  useEffect(() => {
    const targetModel = getModelForRoute(location.pathname);
    
    // Only update if model is different
    if (targetModel !== currentModelRef.current) {
      const modelViewer = document.querySelector('#bg-model') as any;
      
      if (modelViewer) {
        // If model viewer already has a src, do smooth transition
        if (modelViewer.src && currentModelRef.current) {
          updateModel(targetModel);
        } else {
          // First load - just set the src
          modelViewer.src = targetModel;
          currentModelRef.current = targetModel;
        }
      }
    }
  }, [location.pathname, updateModel]);

  // Listen for model load to fade back in
  useEffect(() => {
    const modelViewer = document.querySelector('#bg-model') as any;
    if (!modelViewer) return;

    const handleLoad = () => {
      const container = document.getElementById('bg-model-container');
      if (container) {
        container.style.transition = 'opacity 0.5s ease-in';
        container.style.opacity = '0.6';
        container.classList.add('active');
      }
    };

    modelViewer.addEventListener('load', handleLoad);
    return () => modelViewer.removeEventListener('load', handleLoad);
  }, []);

  return {
    currentModel: currentModelRef.current || getModelForRoute(location.pathname),
    updateModel,
  };
};

export default useRouteModel;

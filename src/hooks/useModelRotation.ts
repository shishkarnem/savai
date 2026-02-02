import { useEffect, useRef } from 'react';

/**
 * Hook to enable swipe/drag rotation on the 3D background model.
 * This works on all pages where the model-viewer is present.
 */
export const useModelRotation = () => {
  const rotationRef = useRef(0);
  const lastXRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleStart = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      lastXRef.current = 'touches' in e 
        ? (e as TouchEvent).touches[0].clientX 
        : (e as MouseEvent).clientX;
    };
    
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      
      const currentX = 'touches' in e 
        ? (e as TouchEvent).touches[0].clientX 
        : (e as MouseEvent).clientX;
      const deltaX = currentX - lastXRef.current;
      lastXRef.current = currentX;
      
      rotationRef.current += deltaX * 0.4;
      
      const bgModel = document.querySelector('#bg-model') as any;
      if (bgModel) {
        bgModel.cameraOrbit = `${rotationRef.current}deg 75deg 105%`;
      }
    };
    
    const handleEnd = () => {
      isDraggingRef.current = false;
    };
    
    // Mouse events
    window.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    // Touch events
    window.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
    
    return () => {
      window.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  return { rotationRef };
};

export default useModelRotation;

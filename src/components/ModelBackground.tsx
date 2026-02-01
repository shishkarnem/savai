import React from 'react';
import { useRouteModel } from '@/hooks/useRouteModel';
import ModelLoadingIndicator from './ModelLoadingIndicator';

/**
 * Component that manages the 3D model background based on current route.
 * Must be placed inside a Router context.
 */
export const ModelBackground: React.FC = () => {
  // This hook handles all the route-based model switching
  const { isLoading, loadProgress } = useRouteModel();
  
  return (
    <ModelLoadingIndicator 
      isLoading={isLoading && loadProgress < 100 && loadProgress > 0} 
      progress={loadProgress}
      modelName="механизма"
    />
  );
};

export default ModelBackground;

import { useEffect } from 'react';
import { useRouteModel } from '@/hooks/useRouteModel';

/**
 * Component that manages the 3D model background based on current route.
 * Must be placed inside a Router context.
 */
export const ModelBackground: React.FC = () => {
  // This hook handles all the route-based model switching
  useRouteModel();
  
  return null; // This component doesn't render anything
};

export default ModelBackground;

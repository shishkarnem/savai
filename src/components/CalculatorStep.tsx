import React from 'react';
import CalculatorWizard from './CalculatorWizard';

interface CalculatorStepProps {
  hasBusinessInfo: boolean;
  onBack: () => void;
  selectedExpert?: string;
}

export const CalculatorStep: React.FC<CalculatorStepProps> = ({
  onBack,
  selectedExpert,
}) => {
  return <CalculatorWizard onBack={onBack} selectedExpert={selectedExpert} />;
};

export default CalculatorStep;

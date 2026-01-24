import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import CalculatorWizard from '@/components/CalculatorWizard';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const Calculator: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      <Header onLogoClick={() => navigate('/')} />
      <main className="w-full max-w-4xl flex-grow">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.35 }}
          className="w-full"
        >
          <CalculatorWizard onBack={() => navigate('/')} />
        </motion.div>
      </main>
      <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
        © 1885-2026 SAV AI • Королевская Академия Робототехники
      </footer>
    </div>
  );
};

export default Calculator;

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  stepKey: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    filter: 'blur(4px)',
  },
  in: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  out: {
    opacity: 0,
    scale: 1.02,
    filter: 'blur(4px)',
  },
};

const pageTransition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.4,
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children, stepKey }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;

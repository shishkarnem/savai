import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { classifyBusiness } from '@/services/geminiService';
import { BusinessInfo } from '@/types';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import ProcessingLoader from '@/components/ProcessingLoader';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const AISeller: React.FC = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClassify = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    try {
      const info = await classifyBusiness(inputValue);
      // Store in sessionStorage for next step
      sessionStorage.setItem('sav-business-info', JSON.stringify(info));
      navigate('/ai-seller/result');
    } catch (err) {
      console.error(err);
      alert('Ошибка давления пара! Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      {isLoading && <ProcessingLoader />}
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
          <div className="steam-fade space-y-5">
            <div className="steampunk-border p-5 md:p-10">
              <Rivets />
              <h2 className="text-2xl md:text-4xl mb-3 text-center sm:text-left">
                <i className="fa-solid fa-robot mr-2"></i>
                ИИ-Продавец
              </h2>
              <p className="text-sm md:text-lg leading-relaxed mb-6 italic opacity-80">
                Опишите род вашей деятельности, и мои шестерни мгновенно определят сегмент 
                и сферу вашего предприятия для подбора оптимального тарифа.
              </p>
              <div className="space-y-5">
                <textarea
                  className="glass-input w-full p-4 rounded-xl outline-none transition-all h-28 md:h-32 text-sm md:text-lg shadow-inner"
                  placeholder="Опишите ваше дело... (например: мастерская по починке дирижаблей)"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button 
                  onClick={handleClassify}
                  disabled={!inputValue.trim() || isLoading}
                  className="steampunk-button w-full py-3.5 text-lg md:text-2xl disabled:opacity-50"
                >
                  <i className="fa-solid fa-cogs mr-2"></i>
                  Классифицировать
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="w-full border border-foreground/10 text-primary py-3 text-base hover:bg-foreground/5 transition-all rounded-xl"
                >
                  <i className="fa-solid fa-arrow-left mr-2"></i>
                  Назад
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
        © 1885-2026 SAV AI • Королевская Академия Робототехники
      </footer>
    </div>
  );
};

export default AISeller;

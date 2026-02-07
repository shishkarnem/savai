import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useActionTracker } from '@/hooks/useActionTracker';

const CalculatorStep5: React.FC = () => {
  const navigate = useNavigate();
  const [functionality, setFunctionality] = useState('');
  const { trackAction, saveSessionData } = useActionTracker('calculator');

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step5' }); }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.functionality) setFunctionality(parsed.functionality);
      } catch {}
    }
  }, []);

  const handleNext = () => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    const data = saved ? JSON.parse(saved) : {};
    trackAction('next_step', { page: '/calculator/step5', value: functionality.substring(0, 50) });
    saveSessionData({ ...data, functionality, step: 'step5' } as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify({ ...data, functionality }));
    navigate('/calculator/step6');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      <Header onLogoClick={() => navigate('/')} />
      <main className="w-full max-w-4xl flex-grow">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <div className="steam-fade space-y-5 w-full">
            <div className="flex justify-between items-center border-b border-foreground/10 pb-3 mb-6">
              <h2 className="text-xl md:text-4xl text-primary">Калькулятор Замены</h2>
              <button onClick={() => navigate('/')} className="text-primary underline text-xs md:text-base opacity-70 hover:opacity-100 transition-opacity">
                Вернуться
              </button>
            </div>

            <div className="steampunk-border p-4 md:p-6 relative" style={{ minHeight: '500px' }}>
              <Rivets />
              
              <div className="mb-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Шаг 5 из 8</span>
                  <span>62%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '62.5%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
                <p className="text-muted-foreground text-sm mb-4">
                  Опишите функционал ИИ-бота — что он должен делать, какие процессы автоматизировать.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium">Техническое задание *</label>
                  </div>
                  <Textarea
                    placeholder="Например: Обрабатывает лиды, продаёт услугу, считает стоимость по калькулятору и прайсу. Регистрирует клиентов в CRM, назначает встречи по календарю..."
                    value={functionality}
                    onChange={(e) => setFunctionality(e.target.value)}
                    className="bg-background/50 border-primary/30 min-h-[150px]"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {functionality.length}/2000
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
                <Button variant="outline" onClick={() => navigate('/calculator/step4')} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button onClick={handleNext} disabled={!functionality} className="gap-2">
                  Далее
                  <ChevronRight className="w-4 h-4" />
                </Button>
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

export default CalculatorStep5;

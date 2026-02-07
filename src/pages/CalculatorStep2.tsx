import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { useActionTracker } from '@/hooks/useActionTracker';

const DEPARTMENTS = [
  { value: 'sales', label: '🛒 Отдел продаж', description: 'ИИ заменит на всех этапах продаж, от общения с новыми теплыми лидами до закрытия сделки.' },
  { value: 'hr', label: '👥 Отдел найма', description: 'ИИ заменит на этапах отклика, собеседования, обучения, тестовых заданий.' },
  { value: 'callcenter', label: '📞 Call-центр', description: 'Для простых консультаций по продукту и записи на встречу со специалистами.' },
  { value: 'dev', label: '💻 Отдел разработки', description: 'Бот для написания кода или проверки кода, запуск готовых решений.' },
  { value: 'marketing', label: '📈 Отдел маркетинга', description: 'Помощь в настройке рекламы, дизайн, креативы, написание акций.' },
  { value: 'copywriting', label: '✍️ Копирайтинг', description: 'Рерайт постов, кросспостинг, публикация.' },
  { value: 'docs', label: '📄 Делопроизводство', description: 'Работа с документооборотом, договорами, актами, счетами.' },
  { value: 'legal', label: '⚖️ Юридический отдел', description: 'Проверка документов, работа с правовыми базами, консультации.' }
];

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const CalculatorStep2: React.FC = () => {
  const navigate = useNavigate();
  const [department, setDepartment] = useState('');
  const { trackAction, saveSessionData } = useActionTracker('calculator');

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step2' }); }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.department) setDepartment(parsed.department);
      } catch {}
    }
  }, []);

  const handleNext = () => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    const data = saved ? JSON.parse(saved) : {};
    trackAction('next_step', { page: '/calculator/step2', value: department });
    saveSessionData({ ...data, department, step: 'step2' } as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify({ ...data, department }));
    navigate('/calculator/step3');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      <Header onLogoClick={() => navigate('/')} />
      <main className="w-full max-w-4xl flex-grow">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
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
                  <span>Шаг 2 из 8</span>
                  <span>25%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '25%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
                <p className="text-muted-foreground text-sm mb-4">
                  Выберите подразделение для роботизации. За 1 расчёт — 1 отдел.
                </p>
                
                <div className="grid gap-3">
                  {DEPARTMENTS.map(dept => (
                    <button
                      key={dept.value}
                      onClick={() => setDepartment(dept.value)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        department === dept.value
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-primary/20 bg-background/30 hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{dept.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{dept.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
                <Button variant="outline" onClick={() => navigate('/calculator/step1')} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button onClick={handleNext} disabled={!department} className="gap-2">
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

export default CalculatorStep2;

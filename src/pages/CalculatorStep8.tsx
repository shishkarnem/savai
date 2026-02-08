import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Send, Tag, Loader2, Check } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useActionTracker } from '@/hooks/useActionTracker';

const DEPARTMENT_LABELS: Record<string, string> = {
  sales: 'Отдел продаж',
  hr: 'Отдел найма',
  callcenter: 'Call-центр',
  dev: 'Отдел разработки',
  marketing: 'Отдел маркетинга',
  copywriting: 'Копирайтинг',
  docs: 'Делопроизводство',
  legal: 'Юридический отдел'
};

const FORM_URL = 'https://docs.google.com/forms/d/13OVMyrJAhOJiaeoa_UB1VV_htOgaj-DlnCRUb3K-h8M/edit';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxnQHoV6xKTbWyA1uA329B4YtX_X1OXpOUxLFdaaOoeZHHsnvy_-PDONkZNMo7KVgGs/exec';

interface FormData {
  fullName: string;
  company: string;
  product: string;
  city: string;
  department: string;
  employeeCount: string;
  averageSalary: string;
  functionality: string;
  maintenance: string;
  selectedExpert: string;
  promoCode: string;
}

const CalculatorStep8: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: telegramProfile } = useTelegramAuth();
  const [promoCode, setPromoCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const { trackAction, saveSessionData } = useActionTracker('calculator');

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step8' }); }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
        if (parsed.promoCode) setPromoCode(parsed.promoCode);
      } catch {}
    }
  }, []);

  const calculateEstimate = () => {
    if (!formData) return 0;
    const employees = parseInt(formData.employeeCount) || 0;
    const salary = parseInt(formData.averageSalary) || 0;
    return employees * salary;
  };

  const [submitError, setSubmitError] = useState(false);

  const submitForm = async () => {
    if (!formData) {
      console.error('submitForm: formData is null, cannot submit');
      toast({ title: "Ошибка", description: "Нет данных для отправки. Пройдите все шаги калькулятора.", variant: "destructive" });
      return;
    }
    
    trackAction('submit_calculator', { page: '/calculator/step8', value: promoCode || 'no-promo' });
    saveSessionData({ ...formData, promoCode, step: 'submitted' } as any);
    
    // Show success screen immediately
    setIsSubmitting(true);
    setIsComplete(true);
    
    const chatId = telegramProfile?.telegram_id 
      ? String(telegramProfile.telegram_id) 
      : Date.now().toString();
    
    // Build payload with field name fallbacks
    const payload = {
      formUrl: FORM_URL,
      chat_id: chatId,
      'ФИО': formData.fullName || '',
      'Компания': formData.company || '',
      'Продукт': formData.product || '',
      'Город': formData.city || '',
      'Подразделение': DEPARTMENT_LABELS[formData.department] || formData.department || '',
      'Сотрудников': formData.employeeCount || '',
      'Средняя ЗП': formData.averageSalary || '',
      'Выбранный эксперт': formData.selectedExpert || 'Dr.White',
      'Функционал': (formData.functionality || '').slice(0, 2000),
      'Обслуживание': formData.maintenance || 'Нет',
      'ПРОМОКОД': promoCode || ''
    };

    console.log('Calculator POST payload:', JSON.stringify(payload));

    // Send POST in background - don't block the success screen
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      console.log('Calculator POST sent, response type:', response.type);
      
      // Clear sessionStorage only after successful send
      sessionStorage.removeItem('sav-calculator-data');
      
      toast({
        title: "Расчёт отправлен!",
        description: "В течение минуты вы получите итоговый расчёт.",
      });
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError(true);
      toast({
        title: "Ошибка отправки",
        description: "Попробуйте заполнить форму по ссылке ниже.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
        <Header onLogoClick={() => navigate('/')} />
        <main className="w-full max-w-4xl flex-grow">
          <div className="steam-fade space-y-5 w-full">
            <div className="flex justify-between items-center border-b border-foreground/10 pb-3 mb-6">
              <h2 className="text-xl md:text-4xl text-primary">Калькулятор Замены</h2>
            </div>
            
            <div className="steampunk-border p-6 md:p-8 relative text-center">
              <Rivets />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-primary" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-4">
                {submitError ? 'Ошибка отправки' : isSubmitting ? 'Отправка расчёта...' : 'Расчёт отправлен!'}
              </h3>
              {isSubmitting && (
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              )}
              <p className="text-muted-foreground mb-6">
                {submitError 
                  ? 'Не удалось отправить расчёт автоматически. Заполните форму по ссылке ниже.'
                  : isSubmitting 
                    ? 'Пожалуйста, подождите...'
                    : 'В течение минуты вы получите итоговый расчёт, который будет включать:'}
              </p>
              <ul className="text-left max-w-md mx-auto space-y-2 mb-6">
                <li>✨ Стоимость ИИ чат-бота</li>
                <li>✨ Возможные расходы на софт</li>
                <li>✨ Окупаемость в днях</li>
              </ul>
              <p className="text-xs text-muted-foreground mb-4">
                Если расчёт не пришёл, заполните{' '}
                <a 
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdSARiTa4zYB-sYseymb3Q0C1Y_dBh8oDLavON_2mTu8o574w/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  гугл-форму
                </a>
              </p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Вернуться назад
              </Button>
            </div>
          </div>
        </main>
        <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
          © 1885-2026 SAV AI • Королевская Академия Робототехники
        </footer>
      </div>
    );
  }

  const estimatedCost = calculateEstimate();

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
                  <span>Шаг 8 из 8</span>
                  <span>100%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
                <p className="text-muted-foreground text-sm mb-4">
                  Промокод от партнёра даёт скидку 5%. Если нет — оставьте поле пустым.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium">Промокод</label>
                  </div>
                  <Input
                    placeholder="Например: PARTNER2024"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="bg-background/50 border-primary/30"
                  />
                </div>
                
                {formData && (
                  <div className="mt-6 p-4 rounded-lg border border-primary/30 bg-gradient-to-br from-background/50 to-primary/5">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      📋 Итоговые данные:
                    </h4>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p>👤 {formData.fullName}</p>
                      <p>🏢 {formData.company} — {formData.product}</p>
                      <p>🌆 {formData.city}</p>
                      <p>📂 {DEPARTMENT_LABELS[formData.department] || formData.department}</p>
                      <p>👥 {formData.employeeCount} сотр. × {parseInt(formData.averageSalary).toLocaleString()}₽</p>
                      <p>🔧 Обслуживание: {formData.maintenance}</p>
                      <p>🎓 Эксперт: {formData.selectedExpert}</p>
                      {promoCode && <p>🏷️ Промокод: {promoCode}</p>}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Примерная стоимость:</span>
                        <span className="text-lg font-bold text-primary">
                          ≈ {estimatedCost.toLocaleString()}₽
                          <span className="text-xs font-normal text-muted-foreground">/мес</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
                <Button variant="outline" onClick={() => navigate('/calculator/step7')} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button onClick={submitForm} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Запустить расчёт
                    </>
                  )}
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

export default CalculatorStep8;

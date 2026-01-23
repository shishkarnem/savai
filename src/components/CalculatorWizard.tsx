import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Send, Loader2, Check, User, Building2, Package, MapPin, Users, Wallet, FileText, Wrench, Tag, RefreshCw } from 'lucide-react';
import Rivets from './Rivets';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCities, syncCities } from '@/hooks/useCities';
import { CitySearchSelect } from './CitySearchSelect';

interface CalculatorWizardProps {
  onBack: () => void;
  selectedExpert?: string;
}

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
  promoCode: string;
}

// Fallback cities in case DB is empty
const FALLBACK_CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград', 'Краснодар',
  'Саратов', 'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Ульяновск',
  'Иркутск', 'Хабаровск', 'Ярославль', 'Владивосток', 'Махачкала',
  'Томск', 'Оренбург', 'Кемерово', 'Астана', 'Алматы', 'Минск'
];

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

export const CalculatorWizard: React.FC<CalculatorWizardProps> = ({ onBack, selectedExpert = 'Dr.White' }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSyncingCities, setIsSyncingCities] = useState(false);
  const { toast } = useToast();
  const { data: citiesData, isLoading: citiesLoading, refetch: refetchCities } = useCities();
  
  // Use cities from DB with full data
  const citiesWithSalary = citiesData && citiesData.length > 0 
    ? citiesData
    : FALLBACK_CITIES.map((name, i) => ({ id: `fallback-${i}`, name, avg_salary: null }));
  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    company: '',
    product: '',
    city: '',
    department: '',
    employeeCount: '',
    averageSalary: '',
    functionality: '',
    maintenance: '',
    promoCode: ''
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle city selection with auto-fill salary
  const handleCitySelect = (cityName: string, avgSalary: number | null) => {
    setFormData(prev => ({
      ...prev,
      city: cityName,
      // Auto-fill salary if available and current salary is empty
      averageSalary: prev.averageSalary || (avgSalary ? String(avgSalary) : prev.averageSalary),
    }));
  };
  
  // Handle city sync
  const handleSyncCities = async () => {
    setIsSyncingCities(true);
    try {
      const result = await syncCities();
      await refetchCities();
      toast({
        title: "Города синхронизированы",
        description: `Загружено ${result.synced} городов`,
      });
    } catch (error) {
      console.error('Error syncing cities:', error);
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось загрузить города",
        variant: "destructive",
      });
    } finally {
      setIsSyncingCities(false);
    }
  };

  const TOTAL_STEPS = 7;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.fullName && formData.company && formData.product && formData.city);
      case 2:
        return !!formData.department;
      case 3:
        return !!formData.employeeCount && parseInt(formData.employeeCount) >= 2;
      case 4:
        return !!formData.averageSalary && parseInt(formData.averageSalary) > 0;
      case 5:
        return !!formData.functionality;
      case 6:
        return !!formData.maintenance;
      case 7:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Calculate estimated cost
  const calculateEstimate = () => {
    const employees = parseInt(formData.employeeCount) || 0;
    const salary = parseInt(formData.averageSalary) || 0;
    return employees * salary;
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    
    const payload = {
      formUrl: FORM_URL,
      chat_id: Date.now().toString(),
      'ФИО': formData.fullName,
      'Компания': formData.company,
      'Продукт': formData.product,
      'Город': formData.city,
      'Подразделение': DEPARTMENT_LABELS[formData.department] || formData.department,
      'Сотрудников': formData.employeeCount,
      'Средняя ЗП': formData.averageSalary,
      'Выбранный эксперт': selectedExpert,
      'Функционал': formData.functionality.slice(0, 2000),
      'Обслуживание': formData.maintenance,
      'ПРОМОКОД': formData.promoCode || ''
    };

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setIsComplete(true);
      toast({
        title: "Расчёт отправлен!",
        description: "В течение минуты вы получите итоговый расчёт.",
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Расчёт отправлен",
        description: "Если не получите ответ, заполните форму по ссылке.",
        variant: "destructive"
      });
      setIsComplete(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm mb-6">
              Стоимость считается просто — мы берём среднюю зарплату сотрудников по рынку за месяц, 
              и это будет стоимостью создания ИИ бота.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">ФИО *</label>
              </div>
              <Input
                placeholder="Иванов Иван Иванович"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                className="bg-background/50 border-primary/30"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Компания *</label>
              </div>
              <Input
                placeholder="Название компании или бренда"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                className="bg-background/50 border-primary/30"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Продукт *</label>
              </div>
              <Input
                placeholder="Основной товар или услуга"
                value={formData.product}
                onChange={(e) => updateField('product', e.target.value)}
                className="bg-background/50 border-primary/30"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <label className="text-sm font-medium">Город *</label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSyncCities}
                  disabled={isSyncingCities}
                  className="h-7 px-2 text-xs"
                >
                  {isSyncingCities ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <CitySearchSelect
                cities={citiesWithSalary}
                value={formData.city}
                onChange={handleCitySelect}
                isLoading={citiesLoading}
                placeholder="Начните вводить название города..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm mb-4">
              Выберите подразделение для роботизации. За 1 расчёт — 1 отдел.
            </p>
            
            <div className="grid gap-3">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept.value}
                  onClick={() => updateField('department', dept.value)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.department === dept.value
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
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm mb-4">
              Укажите количество сотрудников в отделе, которых можно заменить на ИИ. 
              Один бот может заменить несколько сотрудников. Минимум — 2 (бот работает 24/7).
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Количество сотрудников *</label>
              </div>
              <Input
                type="number"
                min="2"
                placeholder="Минимум 2"
                value={formData.employeeCount}
                onChange={(e) => updateField('employeeCount', e.target.value)}
                className="bg-background/50 border-primary/30"
              />
              {formData.employeeCount && parseInt(formData.employeeCount) < 2 && (
                <p className="text-destructive text-xs">Минимальное количество — 2 сотрудника</p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm mb-4">
              Укажите среднюю зарплату на ОДНОГО сотрудника в рублях. 
              Если укажете меньше рыночной по вашему городу, расчёт будет по рыночной.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Средняя зарплата (₽) *</label>
              </div>
              <Input
                type="number"
                min="1"
                placeholder="Например: 80000"
                value={formData.averageSalary}
                onChange={(e) => updateField('averageSalary', e.target.value)}
                className="bg-background/50 border-primary/30"
              />
            </div>
            
            <a 
              href="https://docs.google.com/spreadsheets/d/1ZLx0ohpR2TzuDxYeJITJP8GJ2BmzDC-_bR_bNEDlfzE/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline text-xs hover:opacity-80"
            >
              📊 Таблица средних зарплат по городам
            </a>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
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
                value={formData.functionality}
                onChange={(e) => updateField('functionality', e.target.value)}
                className="bg-background/50 border-primary/30 min-h-[150px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.functionality.length}/2000
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm mb-4">
              ИИ боты обновляются постоянно. Обслуживание — 10% от стоимости ежемесячно. 
              Можете отказаться в любой момент или заказывать консультацию за 5000₽/час.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Нужно обслуживание? *</label>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateField('maintenance', 'Да')}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    formData.maintenance === 'Да'
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                      : 'border-primary/20 bg-background/30 hover:border-primary/50'
                  }`}
                >
                  <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <div className="font-medium">Да</div>
                  <div className="text-xs text-muted-foreground">+10% в месяц</div>
                </button>
                
                <button
                  onClick={() => updateField('maintenance', 'Нет')}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    formData.maintenance === 'Нет'
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                      : 'border-primary/20 bg-background/30 hover:border-primary/50'
                  }`}
                >
                  <div className="w-6 h-6 mx-auto mb-2 text-muted-foreground">✕</div>
                  <div className="font-medium">Нет</div>
                  <div className="text-xs text-muted-foreground">Самостоятельно</div>
                </button>
              </div>
            </div>
          </div>
        );

      case 7:
        const estimatedCost = calculateEstimate();
        
        return (
          <div className="space-y-4">
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
                value={formData.promoCode}
                onChange={(e) => updateField('promoCode', e.target.value.toUpperCase())}
                className="bg-background/50 border-primary/30"
              />
            </div>
            
            <div className="mt-6 p-4 rounded-lg border border-primary/30 bg-gradient-to-br from-background/50 to-primary/5">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                📋 Итоговые данные:
              </h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>👤 {formData.fullName}</p>
                <p>🏢 {formData.company} — {formData.product}</p>
                <p>🌆 {formData.city}</p>
                <p>📂 {DEPARTMENT_LABELS[formData.department]}</p>
                <p>👥 {formData.employeeCount} сотр. × {parseInt(formData.averageSalary).toLocaleString()}₽</p>
                <p>🔧 Обслуживание: {formData.maintenance}</p>
                {formData.promoCode && <p>🏷️ Промокод: {formData.promoCode}</p>}
              </div>
              
              {/* Estimated cost panel */}
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
          </div>
        );

      default:
        return null;
    }
  };

  if (isComplete) {
    return (
      <div className="steam-fade space-y-5 w-full">
        <div className="flex justify-between items-center border-b border-foreground/10 pb-3 mb-6">
          <h2 className="text-xl md:text-4xl text-primary">Калькулятор Замены</h2>
          <button onClick={onBack} className="text-primary underline text-xs md:text-base opacity-70 hover:opacity-100 transition-opacity">
            Вернуться
          </button>
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
          <h3 className="text-2xl font-bold mb-4">Расчёт отправлен!</h3>
          <p className="text-muted-foreground mb-6">
            В течение минуты вы получите итоговый расчёт, который будет включать:
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
          <Button onClick={onBack} className="mt-4">
            Вернуться назад
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="steam-fade space-y-5 w-full">
      <div className="flex justify-between items-center border-b border-foreground/10 pb-3 mb-6">
        <h2 className="text-xl md:text-4xl text-primary">Калькулятор Замены</h2>
        <button onClick={onBack} className="text-primary underline text-xs md:text-base opacity-70 hover:opacity-100 transition-opacity">
          Вернуться
        </button>
      </div>
      
      <div className="steampunk-border p-4 md:p-6 relative" style={{ minHeight: '500px' }}>
        <Rivets />
        
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Шаг {currentStep} из {TOTAL_STEPS}</span>
            <span>{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-2 bg-background/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-[350px]"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </Button>
          
          {currentStep < TOTAL_STEPS ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="gap-2"
            >
              Далее
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={submitForm}
              disabled={isSubmitting}
              className="gap-2"
            >
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CalculatorWizard;

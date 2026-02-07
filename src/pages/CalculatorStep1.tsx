import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, User, Building2, Package, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CitySearchSelect } from '@/components/CitySearchSelect';
import { useCities, syncCities } from '@/hooks/useCities';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActionTracker } from '@/hooks/useActionTracker';

const FALLBACK_CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
];

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const CalculatorStep1: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: citiesData, isLoading: citiesLoading, refetch: refetchCities } = useCities();
  const { profile: telegramProfile } = useTelegramAuth();
  const [isSyncingCities, setIsSyncingCities] = useState(false);
  const { trackAction, saveSessionData } = useActionTracker('calculator');

  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    product: '',
    city: '',
    avgSalary: null as number | null,
  });

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step1' }); }, []);

  // Load from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch {}
    }
  }, []);

  // Auto-fill from Telegram
  useEffect(() => {
    if (telegramProfile && !formData.fullName) {
      const fullName = [telegramProfile.first_name, telegramProfile.last_name]
        .filter(Boolean)
        .join(' ');
      if (fullName) {
        setFormData(prev => ({ ...prev, fullName }));
      }
    }
  }, [telegramProfile]);

  const citiesWithSalary = citiesData && citiesData.length > 0
    ? citiesData
    : FALLBACK_CITIES.map((name, i) => ({ id: `fallback-${i}`, name, avg_salary: null }));

  const handleCitySelect = (cityName: string, avgSalary: number | null) => {
    setFormData(prev => ({ ...prev, city: cityName, avgSalary }));
  };

  const handleSyncCities = async () => {
    setIsSyncingCities(true);
    try {
      const result = await syncCities();
      await refetchCities();
      toast({
        title: "Города синхронизированы",
        description: `Загружено ${result.synced} городов`,
      });
    } catch {
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось загрузить города",
        variant: "destructive",
      });
    } finally {
      setIsSyncingCities(false);
    }
  };

  const canProceed = formData.fullName && formData.company && formData.product && formData.city;

  const handleNext = () => {
    trackAction('next_step', { page: '/calculator/step1', value: formData.company });
    saveSessionData({ ...formData, step: 'step1' } as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify(formData));
    navigate('/calculator/step2');
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
          transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.35 }}
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
              
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Шаг 1 из 8</span>
                  <span>12%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '12.5%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
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
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
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

              {/* Navigation */}
              <div className="flex justify-end mt-6 pt-4 border-t border-primary/20">
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="gap-2"
                >
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

export default CalculatorStep1;

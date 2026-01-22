import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlanData, PlanLevel } from '../types';
import { FALLBACK_PLANS } from '../constants';
import Rivets from './Rivets';
import { Repeat, Zap, Check, Info, Cog, Wallet, ChevronLeft } from 'lucide-react';

type PaymentType = 'monthly' | 'onetime';

interface PlansStepProps {
  plans: PlanData[];
  onSelectPlan: (level: PlanLevel, paymentType: PaymentType) => void;
  onExpert: () => void;
  onCalculator: () => void;
}

export const PlansStep: React.FC<PlansStepProps> = ({
  plans,
  onSelectPlan,
  onExpert,
  onCalculator,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanLevel | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const displayPlans = plans.length > 0 ? plans : FALLBACK_PLANS;
  
  const selectedPlanData = displayPlans.find(p => p.package === selectedPlan);

  const handlePlanClick = (plan: PlanLevel) => {
    setSelectedPlan(plan);
    setPaymentType(null);
  };

  const handlePaymentSelect = (type: PaymentType) => {
    setPaymentType(type);
  };

  const handleConfirm = () => {
    if (selectedPlan && paymentType) {
      onSelectPlan(selectedPlan, paymentType);
    }
  };

  const handleBack = () => {
    if (paymentType) {
      setPaymentType(null);
    } else {
      setSelectedPlan(null);
    }
  };

  // Calculate price based on payment type
  const getPrice = (basePrice: number | undefined, type: PaymentType) => {
    if (!basePrice) return 'По запросу';
    if (type === 'onetime') {
      return `${(basePrice * 6).toLocaleString()} ₽`;
    }
    return `${basePrice.toLocaleString()} ₽/мес`;
  };

  // If a plan is selected, show payment type selection
  if (selectedPlan && selectedPlanData) {
    return (
      <div className="steam-fade space-y-5">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleBack}
            className="p-2 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
          <h2 className="text-2xl md:text-4xl text-primary">{selectedPlan}</h2>
        </div>

        {/* Full Plan Description */}
        <div className="steampunk-border p-4 md:p-6 relative mb-6">
          <Rivets />
          <h3 className="text-lg font-bold text-primary mb-4 border-b border-primary/20 pb-2">
            📋 Полное описание чертежа
          </h3>
          <div className="text-sm whitespace-pre-wrap leading-relaxed opacity-80">
            {selectedPlanData.fullDescription || 'Описание недоступно'}
          </div>
        </div>

        {/* Payment Type Selection */}
        <div className="steampunk-border p-4 md:p-6 relative">
          <Rivets />
          <h3 className="text-lg font-bold text-primary mb-4 border-b border-primary/20 pb-2">
            ⚙️ Выберите модель оплаты
          </h3>
          
          <div className="grid gap-4 mb-6">
            {/* Monthly Payment Option */}
            <button
              onClick={() => handlePaymentSelect('monthly')}
              className={`relative p-5 rounded-lg border text-left transition-all overflow-hidden ${
                paymentType === 'monthly'
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                  : 'border-primary/20 bg-background/30 hover:border-primary/50'
              }`}
            >
              {/* Steampunk decorative gear */}
              <div className="absolute -right-4 -top-4 opacity-10">
                <Cog className="w-20 h-20 text-primary animate-spin" style={{ animationDuration: '20s' }} />
              </div>
              
              <div className="flex items-start gap-4 relative z-10">
                <div className={`p-3 rounded-lg ${paymentType === 'monthly' ? 'bg-primary/20' : 'bg-primary/10'}`}>
                  <Repeat className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg mb-1">⚙️ Ежемесячный Тариф</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Оплата раз в месяц. Стандартная модель подписки с полным обслуживанием.
                  </div>
                  
                  {/* Info panel */}
                  <div className="p-3 rounded border border-primary/20 bg-background/50 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Токены включены в тариф</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Можно отменить в любой момент</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Бесплатные обновления бота</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Техническая поддержка включена</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-medium mt-2 pt-2 border-t border-primary/20">
                      <Wallet className="w-3 h-3" />
                      <span>Стоимость: {getPrice(selectedPlanData.priceMonth, 'monthly')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>

            {/* One-time Payment Option */}
            <button
              onClick={() => handlePaymentSelect('onetime')}
              className={`relative p-5 rounded-lg border text-left transition-all overflow-hidden ${
                paymentType === 'onetime'
                  ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
                  : 'border-primary/20 bg-background/30 hover:border-accent/50'
              }`}
            >
              {/* Steampunk decorative lightning */}
              <div className="absolute -right-2 -top-2 opacity-10">
                <Zap className="w-16 h-16 text-accent" />
              </div>
              
              <div className="flex items-start gap-4 relative z-10">
                <div className={`p-3 rounded-lg ${paymentType === 'onetime' ? 'bg-accent/20' : 'bg-accent/10'}`}>
                  <Zap className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg mb-1">⚡ Единоразовая Разработка</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Оплата 50/50 за полную разработку. Бот становится вашей собственностью навсегда.
                  </div>
                  
                  {/* Info panel */}
                  <div className="p-3 rounded border border-accent/30 bg-background/50 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Полное владение ботом и исходным кодом</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Нет ежемесячных платежей</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Бот работает на вашей инфраструктуре</span>
                    </div>
                    <div className="flex items-center gap-2 text-accent">
                      <Info className="w-3 h-3" />
                      <span>Токены оплачиваются самостоятельно</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-medium mt-2 pt-2 border-t border-primary/20">
                      <Wallet className="w-3 h-3" />
                      <span>Стоимость: {getPrice(selectedPlanData.priceMonth, 'onetime')} (x6 от тарифа)</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Comparison tooltip */}
          <AnimatePresence>
            {paymentType && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg border border-primary/30 bg-gradient-to-br from-background/80 to-primary/5 mb-4"
              >
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Cog className="w-4 h-4 text-primary" />
                  {paymentType === 'monthly' ? 'Паровой Двигатель Подписки' : 'Механизм Полного Владения'}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {paymentType === 'monthly' 
                    ? 'Ваш ИИ-бот работает как арендованный паровой двигатель — мы обеспечиваем топливо (токены), техническое обслуживание и все обновления. Идеально для быстрого старта без больших вложений.'
                    : 'Вы получаете чертежи и механизм целиком в собственность. Стоимость x6 от ежемесячного тарифа. Оплата 50% при старте разработки и 50% при сдаче проекта. Топливо (токены) оплачиваете самостоятельно через провайдера ИИ.'}
                </p>
                
                {paymentType === 'onetime' && selectedPlanData.priceMonth && (
                  <div className="p-3 rounded border border-accent/30 bg-accent/5 text-xs">
                    <div className="font-medium mb-1">📝 Схема оплаты 50/50:</div>
                    <div className="text-muted-foreground space-y-1">
                      <p>• Предоплата: {((selectedPlanData.priceMonth * 6) / 2).toLocaleString()} ₽ — при начале работ</p>
                      <p>• Остаток: {((selectedPlanData.priceMonth * 6) / 2).toLocaleString()} ₽ — при сдаче проекта</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  className="steampunk-button w-full py-3 mt-4 text-sm"
                >
                  Изучить чертеж
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
          <button 
            onClick={onExpert}
            className="steampunk-button px-6 md:px-10 py-3.5 text-base md:text-lg"
          >
            <i className="fa-solid fa-user-gear"></i> Аудит Экспертом
          </button>
          <button 
            onClick={onCalculator}
            className="border border-foreground/10 text-primary px-6 md:px-10 py-3.5 text-base md:text-lg hover:bg-foreground/5 transition-all rounded-xl backdrop-blur-md"
          >
            Точный расчет
          </button>
        </div>
      </div>
    );
  }

  // Default: show plan cards
  return (
    <div className="steam-fade space-y-5">
      <h2 className="text-3xl md:text-5xl text-center mb-8 text-primary">Каталог Решений</h2>
      
      <div className="bg-foreground/5 backdrop-blur-xl p-3.5 border-l-2 border-primary rounded-r-xl mb-6 italic text-[11px] md:text-sm">
        <p className="opacity-70">Выберите конфигурацию, наиболее пригодную для вашей мануфактуры.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {displayPlans.map((p, idx) => (
          <div 
            key={idx} 
            className="steampunk-border p-5 flex flex-col h-full hover:scale-[1.03] transition-transform cursor-pointer group"
            onClick={() => handlePlanClick(p.package as PlanLevel)}
          >
            <Rivets />
            <div className="text-xl md:text-2xl text-primary mb-3 border-b border-foreground/5 pb-2 font-bold">
              {p.package}
            </div>
            <div className="text-[11px] md:text-xs opacity-60 mb-5 flex-1 whitespace-pre-wrap leading-relaxed">
              {p.fullDescription}
            </div>
            <div className="text-xl md:text-3xl font-bold mb-5 text-center text-primary drop-shadow-lg">
              {p.priceMonth ? `${p.priceMonth.toLocaleString()} ₽` : 'По запросу'}
            </div>
            <button className="steampunk-button w-full py-2.5 text-xs">Изучить чертеж</button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button 
          onClick={onExpert}
          className="steampunk-button px-6 md:px-10 py-3.5 text-base md:text-lg"
        >
          <i className="fa-solid fa-user-gear"></i> Аудит Экспертом
        </button>
        <button 
          onClick={onCalculator}
          className="border border-foreground/10 text-primary px-6 md:px-10 py-3.5 text-base md:text-lg hover:bg-foreground/5 transition-all rounded-xl backdrop-blur-md"
        >
          Точный расчет
        </button>
      </div>
    </div>
  );
};

export default PlansStep;

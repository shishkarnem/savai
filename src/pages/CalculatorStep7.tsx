import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, UserCheck, User, Check, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Expert } from '@/components/ExpertCard';
import { useActionTracker } from '@/hooks/useActionTracker';

const CalculatorStep7: React.FC = () => {
  const navigate = useNavigate();
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const { trackAction, saveSessionData } = useActionTracker('calculator');

  useEffect(() => { trackAction('visit_page', { page: '/calculator/step7' }); }, []);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('experts')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setExperts(data);
      }
      setLoading(false);
    };
    fetchExperts();
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedExpertId) setSelectedExpertId(parsed.selectedExpertId);
      } catch {}
    }
  }, []);

  const handleNext = () => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    const data = saved ? JSON.parse(saved) : {};
    const selectedExpert = experts.find(e => e.id === selectedExpertId);
    const expertName = selectedExpert 
      ? `${selectedExpert.greeting || ''}${selectedExpert.pseudonym || ''}`
      : '';
    trackAction('next_step', { page: '/calculator/step7', value: expertName });
    saveSessionData({ ...data, selectedExpertId, selectedExpert: expertName, step: 'step7' } as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify({ 
      ...data, 
      selectedExpertId,
      selectedExpert: expertName,
    }));
    navigate('/calculator/step8');
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
                  <span>Шаг 7 из 8</span>
                  <span>87%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '87.5%' }} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px]">
                <p className="text-muted-foreground text-sm mb-4">
                  Выберите эксперта, который проведёт бесплатный аудит и поможет с внедрением ИИ.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium">Выберите эксперта *</label>
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-2">
                      {experts.map(expert => (
                        <button
                          key={expert.id}
                          onClick={() => setSelectedExpertId(expert.id)}
                          className={`p-4 rounded-lg border text-left transition-all flex items-center gap-4 ${
                            selectedExpertId === expert.id
                              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                              : 'border-primary/20 bg-background/30 hover:border-primary/50'
                          }`}
                        >
                          {expert.photo_url ? (
                            <img 
                              src={expert.photo_url} 
                              alt={expert.pseudonym || 'Expert'}
                              className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-primary">
                              {expert.greeting}{expert.pseudonym}
                            </div>
                            {expert.spheres && (
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {expert.spheres}
                              </div>
                            )}
                          </div>
                          {selectedExpertId === expert.id && (
                            <Check className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-primary/20">
                <Button variant="outline" onClick={() => navigate('/calculator/step6')} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button onClick={handleNext} disabled={!selectedExpertId} className="gap-2">
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

export default CalculatorStep7;

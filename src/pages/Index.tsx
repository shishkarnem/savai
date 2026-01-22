import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BusinessInfo, PlanData, PlanLevel } from '../types';
import { classifyBusiness, generatePlanPresentation } from '../services/geminiService';
import { fetchPlansFromSheet, fetchSpecificPlan } from '../services/sheetService';
import Header from '../components/Header';
import IgnitionScreen from '../components/IgnitionScreen';
import BootLoader from '../components/BootLoader';
import ProcessingLoader from '../components/ProcessingLoader';
import IntroStep from '../components/IntroStep';
import ClassificationStep from '../components/ClassificationStep';
import PlansStep from '../components/PlansStep';
import PlanDetailsStep from '../components/PlanDetailsStep';
import CalculatorStep from '../components/CalculatorStep';
import ExpertStep from '../components/ExpertStep';
type Step = 'ignition' | 'booting' | 'intro' | 'classification' | 'plans' | 'details' | 'expert' | 'calculator';
const DEFAULT_GLB_URL = "https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQLJ1MGPTJ2Vxs9JjAnEQc6LxgNYmgDFSJoJjMfDDsZOjs8BBsmCzQ_JHppBnY7ByAOExIjbGYqJTkmVVpuYlYEbAV1VAgQCjEWKxseGVMpKyRYNBcXUm4FNwJgOi4UAQ4SOS4tKzsGCyUuTwJgBHdVAGB-S3U.glb";
const Index: React.FC = () => {
  const [step, setStep] = useState<Step>('ignition');
  const [inputValue, setInputValue] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatus, setBootStatus] = useState('Инициализация котлов...');
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanLevel | null>(null);
  const [planDetails, setPlanDetails] = useState<{
    data: PlanData | null;
    presentation: string;
  } | null>(null);
  const rotationRef = useRef(0);
  const lastXRef = useRef(0);
  const startBooting = useCallback((source: string) => {
    setStep('booting');
    setBootProgress(0);
    setBootStatus('Связь с сервером чертежей...');
    const modelViewer = document.querySelector('#bg-model') as any;
    if (modelViewer) {
      modelViewer.src = source;
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      startBooting(DEFAULT_GLB_URL);
    }, 100);
    return () => clearTimeout(timer);
  }, [startBooting]);
  useEffect(() => {
    const modelViewer = document.querySelector('#bg-model') as any;
    if (!modelViewer) return;
    const onProgress = (event: any) => {
      const progress = Math.round(event.detail.totalProgress * 100);
      if (step === 'booting') {
        setBootProgress(progress);
        if (progress > 30) setBootStatus('Смазка шестерней...');
        if (progress > 60) setBootStatus('Подача пара...');
        if (progress > 90) setBootStatus('Запуск поршней...');
      }
    };
    const onLoad = () => {
      if (step === 'booting') {
        setBootProgress(100);
        setBootStatus('Механизм запущен!');
        document.getElementById('bg-model-container')?.classList.add('active');
        setTimeout(() => setStep('intro'), 1200);
      }
    };
    const onError = () => {
      if (step === 'booting') {
        setBootStatus("Ошибка! Механизм заклинило.");
        setTimeout(() => setStep('ignition'), 2000);
      }
    };
    modelViewer.addEventListener('progress', onProgress);
    modelViewer.addEventListener('load', onLoad);
    modelViewer.addEventListener('error', onError);
    return () => {
      modelViewer.removeEventListener('progress', onProgress);
      modelViewer.removeEventListener('load', onLoad);
      modelViewer.removeEventListener('error', onError);
    };
  }, [step]);
  useEffect(() => {
    const handleStart = (e: MouseEvent | TouchEvent) => {
      lastXRef.current = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    };
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const deltaX = currentX - lastXRef.current;
      lastXRef.current = currentX;
      if (step !== 'ignition' && step !== 'booting') {
        rotationRef.current += deltaX * 0.4;
        const bgModel = document.querySelector('#bg-model') as any;
        if (bgModel) {
          bgModel.cameraOrbit = `${rotationRef.current}deg 75deg 105%`;
        }
      }
    };
    window.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleStart, {
      passive: false
    });
    window.addEventListener('touchmove', handleMove, {
      passive: false
    });
    return () => {
      window.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [step]);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => startBooting(event.target?.result as string);
    reader.readAsDataURL(file);
  };
  const handleClassify = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    try {
      const info = await classifyBusiness(inputValue);
      setBusinessInfo(info);
      setStep('classification');
    } catch (err) {
      console.error(err);
      alert('Ошибка давления пара! Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleShowPrices = async () => {
    if (!businessInfo) return;
    setIsLoading(true);
    try {
      const sheetPlans = await fetchPlansFromSheet({
        sphere: businessInfo.sphere,
        segment: businessInfo.segment,
        category: businessInfo.category
      });
      setPlans(sheetPlans);
      setStep('plans');
    } catch {
      setStep('plans');
    } finally {
      setIsLoading(false);
    }
  };
  const handleSelectPlan = async (level: PlanLevel, paymentType: 'monthly' | 'onetime') => {
    if (!businessInfo) return;
    setIsLoading(true);
    setSelectedPlan(level);
    try {
      const data = await fetchSpecificPlan({
        sphere: businessInfo.sphere,
        segment: businessInfo.segment,
        category: businessInfo.category,
        package: level
      });
      // Adjust price for onetime payment
      if (data && paymentType === 'onetime' && data.priceMonth) {
        data.priceMonth = data.priceMonth * 6;
      }
      const presentation = await generatePlanPresentation(businessInfo, level);
      setPlanDetails({
        data,
        presentation
      });
      setStep('details');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  if (step === 'ignition') return <IgnitionScreen urlInput={urlInput} setUrlInput={setUrlInput} onFileUpload={handleFileUpload} onUrlLoad={() => startBooting(urlInput.trim())} />;
  if (step === 'booting') return <BootLoader bootProgress={bootProgress} bootStatus={bootStatus} />;
  return <div className="min-h-screen flex flex-col items-center p-3 md:p-8">
      {isLoading && <ProcessingLoader />}
      <Header onLogoClick={() => setStep('intro')} />
      <main className="w-full max-w-4xl flex-grow">
        {step === 'intro' && <IntroStep inputValue={inputValue} setInputValue={setInputValue} onClassify={handleClassify} onCalculator={() => setStep('calculator')} />}
        {step === 'classification' && businessInfo && <ClassificationStep businessInfo={businessInfo} onShowPrices={handleShowPrices} onBack={() => setStep('intro')} />}
        {step === 'plans' && businessInfo && <PlansStep plans={plans} onSelectPlan={handleSelectPlan} onExpert={() => setStep('expert')} onCalculator={() => setStep('calculator')} />}
        {step === 'details' && planDetails && businessInfo && selectedPlan && <PlanDetailsStep selectedPlan={selectedPlan} planDetails={planDetails} businessInfo={businessInfo} onBack={() => setStep('plans')} onExpert={() => setStep('expert')} onCalculator={() => setStep('calculator')} />}
        {step === 'calculator' && <CalculatorStep hasBusinessInfo={!!businessInfo} onBack={() => setStep(businessInfo ? 'plans' : 'intro')} />}
        {step === 'expert' && <ExpertStep onRestart={() => window.location.reload()} />}
      </main>
      <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
        © 1885-2025 SAV AI • Королевская Академия Робототехники
      </footer>
    </div>;
};
export default Index;
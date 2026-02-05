 import React, { useState } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Sparkles, Loader2, X, CheckCircle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 interface Expert {
   id: string;
   pseudonym: string | null;
   greeting: string | null;
   spheres: string | null;
   description: string | null;
   matchScore?: number;
   matchReason?: string;
 }
 
 interface AIExpertMatcherProps {
   isOpen: boolean;
   onClose: () => void;
   onSelectExpert: (expert: Expert) => void;
 }
 
 export const AIExpertMatcher: React.FC<AIExpertMatcherProps> = ({
   isOpen,
   onClose,
   onSelectExpert,
 }) => {
   const { toast } = useToast();
   const [isLoading, setIsLoading] = useState(false);
   const [matchedExperts, setMatchedExperts] = useState<Expert[]>([]);
   const [businessDescription, setBusinessDescription] = useState('');
 
   const handleMatch = async () => {
     if (!businessDescription.trim()) {
       toast({
         title: 'Опишите ваш бизнес',
         description: 'Введите описание для подбора эксперта',
         variant: 'destructive',
       });
       return;
     }
 
     setIsLoading(true);
     try {
       const { data, error } = await supabase.functions.invoke('ai-match-experts', {
         body: { businessDescription },
       });
 
       if (error) throw error;
 
       if (data.matches && data.matches.length > 0) {
         setMatchedExperts(data.matches);
       } else {
         toast({
           title: 'Не найдено совпадений',
           description: 'Попробуйте описать бизнес подробнее',
         });
       }
     } catch (error) {
       console.error('Error matching experts:', error);
       toast({
         title: 'Ошибка',
         description: 'Не удалось выполнить подбор',
         variant: 'destructive',
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   if (!isOpen) return null;
 
   return (
     <AnimatePresence>
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={onClose}
       >
         <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           exit={{ scale: 0.9, opacity: 0 }}
           className="glass-panel p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto relative"
           onClick={e => e.stopPropagation()}
         >
           <button
             onClick={onClose}
             className="absolute top-4 right-4 text-foreground/60 hover:text-primary transition-colors"
           >
             <X size={20} />
           </button>
 
           <div className="flex items-center gap-3 mb-6">
             <div className="p-2 rounded-lg bg-primary/20">
               <Sparkles className="w-6 h-6 text-primary" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-primary">ИИ-Подбор Эксперта</h2>
               <p className="text-sm text-foreground/60">Опишите свой бизнес для точного подбора</p>
             </div>
           </div>
 
           {matchedExperts.length === 0 ? (
             <div className="space-y-4">
               <textarea
                 value={businessDescription}
                 onChange={e => setBusinessDescription(e.target.value)}
                 placeholder="Опишите ваш бизнес, продукт или услугу..."
                 className="glass-input w-full p-4 rounded-xl h-32 text-sm"
                 disabled={isLoading}
               />
               <Button
                 onClick={handleMatch}
                 disabled={isLoading}
                 className="steampunk-button w-full py-3"
               >
                 {isLoading ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin mr-2" />
                     Анализирую...
                   </>
                 ) : (
                   <>
                     <Sparkles className="w-4 h-4 mr-2" />
                     Найти экспертов
                   </>
                 )}
               </Button>
             </div>
           ) : (
             <div className="space-y-4">
               <p className="text-sm text-foreground/70 mb-4">
                 Найдено совпадений: {matchedExperts.length}
               </p>
               {matchedExperts.map((expert, idx) => (
                 <motion.div
                   key={expert.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   className="steampunk-border p-4 cursor-pointer hover:border-primary/50 transition-all"
                   onClick={() => onSelectExpert(expert)}
                 >
                   <div className="flex items-start justify-between mb-2">
                     <div className="flex items-center gap-2">
                       <span className="text-lg font-bold text-primary">
                         {expert.greeting}{expert.pseudonym}
                       </span>
                       {expert.matchScore && (
                         <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                           {expert.matchScore}% совпадение
                         </span>
                       )}
                     </div>
                     <CheckCircle className="w-5 h-5 text-primary/60" />
                   </div>
                   {expert.matchReason && (
                     <p className="text-sm text-foreground/70 italic">
                       {expert.matchReason}
                     </p>
                   )}
                   {expert.spheres && (
                     <p className="text-xs text-foreground/50 mt-2">
                       Сферы: {expert.spheres}
                     </p>
                   )}
                 </motion.div>
               ))}
               <Button
                 variant="outline"
                 onClick={() => setMatchedExperts([])}
                 className="w-full"
               >
                 Искать заново
               </Button>
             </div>
           )}
         </motion.div>
       </motion.div>
     </AnimatePresence>
   );
 };
 
 export default AIExpertMatcher;
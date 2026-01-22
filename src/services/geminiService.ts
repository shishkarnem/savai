import { supabase } from "@/integrations/supabase/client";
import { BusinessInfo, PlanLevel } from "../types";

export async function classifyBusiness(userInput: string): Promise<BusinessInfo> {
  const { data, error } = await supabase.functions.invoke('classify-business', {
    body: { userInput }
  });

  if (error) {
    console.error("Classification error:", error);
    throw new Error("Ошибка классификации бизнеса");
  }

  if (data.error) {
    console.error("AI error:", data.error);
    throw new Error(data.error);
  }

  return data as BusinessInfo;
}

export async function generatePlanPresentation(businessInfo: BusinessInfo, planLevel: PlanLevel): Promise<string> {
  // Generate a presentation based on business info and plan level
  return `Представляем вам тарифный план "${planLevel}" для вашего бизнеса в сфере ${businessInfo.sphere}!

Этот план идеально подходит для ${businessInfo.segment === 'B2B' ? 'корпоративных клиентов' : 'розничных покупателей'}, предлагающих ${businessInfo.category.toLowerCase()}.

AI-продавец SAV возьмет на себя все рутинные задачи: консультации клиентов, расчет стоимости, обработку заявок и работу с возражениями. Ваши сотрудники смогут сосредоточиться на стратегических задачах, пока наш механический помощник работает 24/7.

Мы гарантируем увеличение конверсии и снижение нагрузки на отдел продаж уже в первый месяц использования!`;
}

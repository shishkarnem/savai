import { GoogleGenAI, Type } from "@google/genai";
import { BusinessInfo, PlanLevel } from "../types";

// Note: GEMINI_API_KEY needs to be configured for AI features to work
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function classifyBusiness(userInput: string): Promise<BusinessInfo> {
  if (!ai) {
    // Fallback mock response when API key is not configured
    console.warn("GEMINI_API_KEY not configured, using mock response");
    return {
      segment: "B2B",
      category: "Услуги",
      sphere: "Технологии",
      description: userInput,
      praise: `Замечательное предприятие! Ваш бизнес "${userInput}" обладает огромным потенциалом для внедрения искусственного интеллекта. Мы видим, как AI-решения могут революционизировать ваши процессы продаж, автоматизировать рутинные задачи и значительно повысить конверсию. Наши механические помощники готовы работать 24/7, обрабатывая запросы клиентов с невероятной точностью и скоростью. Вместе мы построим будущее вашего бизнеса на фундаменте передовых технологий SAV AI!`
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: userInput,
    config: {
      systemInstruction: `You are an expert business consultant. Your task is to analyze a user's business description and classify it strictly into the following categories:
      - Segment: "B2C" or "B2B"
      - Category: "Товары" or "Услуги"
      - Sphere: "Строительство", "Здоровье", "Производство", "Образование", "Реклама", "Транспорт", "Технологии", "Досуг", "Торговля", "Другое"
      
      Additionally, you must write a highly detailed, joyful, and professional praise for this business. The praise must be exactly around 1000 characters long, describing how you see the business and its potential with AI implementation.
      
      Respond in JSON format.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          segment: { type: Type.STRING, enum: ["B2C", "B2B"] },
          category: { type: Type.STRING, enum: ["Товары", "Услуги"] },
          sphere: { type: Type.STRING, enum: ["Строительство", "Здоровье", "Производство", "Образование", "Реклама", "Транспорт", "Технологии", "Досуг", "Торговля", "Другое"] },
          praise: { type: Type.STRING, description: "Detailed 1000-character praise of the business." }
        },
        required: ["segment", "category", "sphere", "praise"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return { ...data, description: userInput };
}

export async function generatePlanPresentation(businessInfo: BusinessInfo, planLevel: PlanLevel): Promise<string> {
  if (!ai) {
    // Fallback mock response
    return `Представляем вам тарифный план "${planLevel}" для вашего бизнеса в сфере ${businessInfo.sphere}!

Этот план идеально подходит для ${businessInfo.segment === 'B2B' ? 'корпоративных клиентов' : 'розничных покупателей'}, предлагающих ${businessInfo.category.toLowerCase()}.

AI-продавец SAV возьмет на себя все рутинные задачи: консультации клиентов, расчет стоимости, обработку заявок и работу с возражениями. Ваши сотрудники смогут сосредоточиться на стратегических задачах, пока наш механический помощник работает 24/7.

Мы гарантируем увеличение конверсии и снижение нагрузки на отдел продаж уже в первый месяц использования!`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Write a presentation for the "${planLevel}" AI Sales Plan for a business in the ${businessInfo.sphere} sphere (${businessInfo.segment}, ${businessInfo.category}). 
    Describe how AI will revolutionize their specific workflow, sales, and customer interaction.
    The text should be around 2000 characters, professional, inspiring, and feature-rich.`,
    config: {
      systemInstruction: "You are a senior AI solutions architect from SAV AI. Write in Russian.",
    }
  });

  return response.text || "";
}

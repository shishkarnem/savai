import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userInput } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Ты - опытный бизнес-консультант SAV AI в стиле стимпанк-эпохи. Твоя задача - проанализировать описание бизнеса пользователя и выполнить классификацию.

ОБЯЗАТЕЛЬНЫЕ ПОЛЯ ДЛЯ ОТВЕТА:
1. segment: строго "B2C" или "B2B"
2. category: строго "Товары" или "Услуги"
3. sphere: одно из: "Строительство", "Здоровье", "Производство", "Образование", "Реклама", "Транспорт", "Технологии", "Досуг", "Торговля", "Другое"
4. praise: Восторженная похвала бизнеса РОВНО на 1000 символов (не меньше 950, не больше 1050)

ВАЖНО для praise:
- Пиши от лица команды SAV AI в стиле стимпанк-эпохи с механическими метафорами
- Начни с комплимента самому бизнесу и его потенциалу
- Опиши КОНКРЕТНО, как ИИ-продавец SAV AI поможет именно ЭТОМУ бизнесу:
  * Какие рутинные задачи автоматизирует
  * Как увеличит конверсию и продажи
  * Как будет работать 24/7 без выходных
  * Как обработает заявки быстрее людей
  * Какие возражения клиентов закроет
- Используй механические метафоры: шестерёнки, поршни, паровые механизмы, латунные клапаны
- Закончи вдохновляющим призывом к сотрудничеству
- Пиши на русском языке

Пример структуры:
"Великолепный механизм! [Комплимент бизнесу]. [Конкретные проблемы которые решит ИИ]. [Как именно ИИ-продавец будет помогать]. [Механические метафоры про работу 24/7]. [Призыв к действию]"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Проанализируй этот бизнес и верни JSON: "${userInput}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_business",
              description: "Классифицирует бизнес и генерирует похвалу",
              parameters: {
                type: "object",
                properties: {
                  segment: { 
                    type: "string", 
                    enum: ["B2C", "B2B"],
                    description: "Сегмент бизнеса" 
                  },
                  category: { 
                    type: "string", 
                    enum: ["Товары", "Услуги"],
                    description: "Категория бизнеса" 
                  },
                  sphere: { 
                    type: "string", 
                    enum: ["Строительство", "Здоровье", "Производство", "Образование", "Реклама", "Транспорт", "Технологии", "Досуг", "Торговля", "Другое"],
                    description: "Сфера деятельности" 
                  },
                  praise: { 
                    type: "string", 
                    description: "Восторженная похвала бизнеса на 1000 символов с описанием пользы ИИ-продавца" 
                  }
                },
                required: ["segment", "category", "sphere", "praise"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_business" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Требуется пополнение баланса" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    // Extract the function call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "classify_business") {
      throw new Error("Invalid response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(JSON.stringify({
      ...result,
      description: userInput
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("classify-business error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

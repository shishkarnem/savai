import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { answers, plans } = await req.json();

    if (!answers) {
      return new Response(
        JSON.stringify({ error: "Answers are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format real plan data for the AI prompt
    let plansInfo = "Тарифы не предоставлены";
    if (plans && Array.isArray(plans) && plans.length > 0) {
      plansInfo = plans.map((p: any, i: number) => {
        const price = p.priceMonth ? `${p.priceMonth.toLocaleString()} ₽/мес` : 'По запросу';
        return `${i + 1}. **${p.package}** — ${price}\n${p.fullDescription || 'Описание недоступно'}`;
      }).join('\n\n');
    }

    const answersInfo = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');

    console.log("Plans info for AI:", plansInfo.substring(0, 200));
    console.log("User answers:", answersInfo);

    // Call AI to recommend tariff
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Ты - консультант по подбору тарифов ИИ-продавца компании SAV AI.

Вот РЕАЛЬНЫЕ доступные тарифы с их описаниями и ценами:

${plansInfo}

На основе ответов пользователя определи наиболее подходящий тариф из списка выше.
ВАЖНО: Используй ТОЧНОЕ название тарифа из списка (Лайт, Эконом, Стандарт, Премиум или VIP).
Учитывай количество каналов, объём сообщений, необходимый функционал и бюджет.

Ответь ТОЛЬКО в формате JSON:
{
  "tariff": "Точное название тарифа из списка",
  "reason": "Краткое обоснование выбора на основе потребностей пользователя (2-3 предложения)"
}`
          },
          {
            role: "user",
            content: `Ответы пользователя:\n${answersInfo}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Требуется пополнение баланса" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI service error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    // Parse AI response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Fallback to Стандарт (middle tariff)
      parsed = { tariff: "Стандарт", reason: "Оптимальный баланс функций и стоимости для большинства бизнесов" };
    }

    // Validate tariff name against available plans
    const validTariffs = plans?.map((p: any) => p.package) || ["Лайт", "Эконом", "Стандарт", "Премиум", "VIP"];
    if (!validTariffs.includes(parsed.tariff)) {
      console.warn(`AI returned unknown tariff "${parsed.tariff}", falling back to Стандарт`);
      parsed.tariff = "Стандарт";
    }

    console.log("Recommended tariff:", parsed.tariff);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-recommend-tariff:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

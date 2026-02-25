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
    const { query, clients } = await req.json();
    
    if (!query || !clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ matchedIds: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare client summaries for AI
    const clientSummaries = clients.slice(0, 100).map((c: any) => ({
      id: c.id,
      summary: [
        c.project_code,
        c.full_name,
        c.telegram_client,
        c.project,
        c.status,
        c.city,
        c.tariff,
        c.expert_pseudonym || c.expert_name,
        c.comment,
        c.service,
        c.functionality,
      ].filter(Boolean).join(' | ')
    }));

    const systemPrompt = `Ты - умный поисковый ассистент CRM системы. Пользователь вводит запрос на естественном языке.
Твоя задача - найти клиентов, которые соответствуют запросу.

Примеры запросов:
- "клиенты из Москвы" - ищи по городу
- "кто на тарифе Стандарт" - ищи по тарифу
- "клиенты с экспертом Алексей" - ищи по имени эксперта
- "кто в статусе отказ" - ищи по статусу
- "проекты по автоматизации" - ищи по названию проекта или функционалу

Верни JSON массив ID клиентов, которые соответствуют запросу. Только ID, без объяснений.
Формат: {"matchedIds": ["id1", "id2", ...]}

Если ничего не найдено, верни: {"matchedIds": []}`;

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
          { 
            role: "user", 
            content: `Запрос пользователя: "${query}"\n\nСписок клиентов:\n${JSON.stringify(clientSummaries, null, 2)}` 
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", matchedIds: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required", matchedIds: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI search failed", matchedIds: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let result = { matchedIds: [] as string[] };
    try {
      result = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", matchedIds: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

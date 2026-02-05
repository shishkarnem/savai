 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const TARIFFS = [
   { name: "Стартовый", description: "Базовые функции для малого бизнеса" },
   { name: "Продвинутый", description: "Расширенный функционал для среднего бизнеса" },
   { name: "Профессиональный", description: "Полный набор функций для масштабного применения" },
 ];
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
 
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const { answers } = await req.json();
 
     if (!answers) {
       return new Response(
         JSON.stringify({ error: "Answers are required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const tariffsInfo = TARIFFS.map((t, i) => `${i + 1}. ${t.name}: ${t.description}`).join('\n');
     const answersInfo = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');
 
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
             content: `Ты - консультант по подбору тарифов ИИ-продавца.
 
 Доступные тарифы:
 ${tariffsInfo}
 
 На основе ответов пользователя определи наиболее подходящий тариф.
 
 Ответь ТОЛЬКО в формате JSON:
 {
   "tariff": "Название тарифа",
   "reason": "Краткое обоснование выбора (1-2 предложения)"
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
       // Fallback to middle tariff
       parsed = { tariff: "Продвинутый", reason: "Оптимальный баланс функций и стоимости" };
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
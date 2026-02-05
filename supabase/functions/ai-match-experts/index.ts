 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
 
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
     const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const { businessDescription } = await req.json();
 
     if (!businessDescription) {
       return new Response(
         JSON.stringify({ error: "Business description is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Fetch all experts from database
     const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
     const { data: experts, error: dbError } = await supabase
       .from("experts")
       .select("id, pseudonym, greeting, spheres, description, cases, tools");
 
     if (dbError) {
       console.error("Database error:", dbError);
       throw new Error("Failed to fetch experts");
     }
 
     if (!experts || experts.length === 0) {
       return new Response(
         JSON.stringify({ matches: [] }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Format experts for AI analysis
     const expertsInfo = experts.map((e, i) => 
       `${i + 1}. ${e.greeting || ''}${e.pseudonym || 'Неизвестный'}: Сферы: ${e.spheres || 'Не указаны'}. Описание: ${e.description || 'Не указано'}`
     ).join('\n');
 
     // Call AI to match experts
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
             content: `Ты - ИИ-консультант по подбору экспертов для бизнеса. Тебе дан список экспертов и описание бизнеса клиента.
 
 Твоя задача:
 1. Проанализировать бизнес клиента
 2. Найти наиболее подходящих экспертов (топ 3)
 3. Для каждого указать процент совпадения (50-100) и краткое обоснование
 
 Ответь в формате JSON:
 {
   "matches": [
     {"index": 1, "matchScore": 85, "matchReason": "Специализируется на..."},
     {"index": 2, "matchScore": 75, "matchReason": "Имеет опыт в..."}
   ]
 }
 
 Если подходящих экспертов нет, верни пустой массив matches.`
           },
           {
             role: "user",
             content: `Бизнес клиента: ${businessDescription}\n\nСписок экспертов:\n${expertsInfo}`
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
       throw new Error("Failed to parse AI response");
     }
 
     // Map AI matches to full expert data
     const matchedExperts = (parsed.matches || []).map((match: any) => {
       const expert = experts[match.index - 1];
       if (!expert) return null;
       return {
         id: expert.id,
         pseudonym: expert.pseudonym,
         greeting: expert.greeting,
         spheres: expert.spheres,
         description: expert.description,
         matchScore: match.matchScore,
         matchReason: match.matchReason,
       };
     }).filter(Boolean);
 
     console.log("Matched experts:", matchedExperts.length);
 
     return new Response(
       JSON.stringify({ matches: matchedExperts }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     console.error("Error in ai-match-experts:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyExpertSelectionRequest {
  expert: {
    id: string;
    greeting: string | null;
    pseudonym: string | null;
    spheres: string | null;
  };
  clientInfo: {
    telegramId: string | null;
    telegramUsername: string | null;
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  aiSellerInfo?: {
    businessType: string | null;
    classificationResult: string | null;
    selectedPlan: string | null;
    presentationText: string | null;
  };
  calculatorInfo?: {
    company: string | null;
    product: string | null;
    city: string | null;
    department: string | null;
    employeeCount: string | null;
    averageSalary: string | null;
    functionality: string | null;
    maintenance: string | null;
  };
  source: 'ai-seller' | 'calculator';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_EXPERT_CHAT_ID = Deno.env.get("TELEGRAM_EXPERT_CHAT_ID");
    
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Telegram bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!TELEGRAM_EXPERT_CHAT_ID) {
      console.error("TELEGRAM_EXPERT_CHAT_ID not configured");
      return new Response(
        JSON.stringify({ error: "Expert chat ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: NotifyExpertSelectionRequest = await req.json();
    console.log("Received expert selection notification:", JSON.stringify(data));

    const { expert, clientInfo, aiSellerInfo, calculatorInfo, source } = data;

    // Build Telegram link
    let telegramLink = "";
    if (clientInfo.telegramUsername) {
      telegramLink = `https://t.me/${clientInfo.telegramUsername.replace('@', '')}`;
    } else if (clientInfo.telegramId) {
      telegramLink = `tg://user?id=${clientInfo.telegramId}`;
    }

    // Build message
    const expertName = `${expert.greeting || ''}${expert.pseudonym || 'Неизвестный'}`;
    const clientName = clientInfo.fullName || 
      [clientInfo.firstName, clientInfo.lastName].filter(Boolean).join(' ') || 
      'Клиент';

    let message = `🎯 <b>Новый выбор эксперта!</b>\n\n`;
    message += `👤 <b>Клиент:</b> ${clientName}\n`;
    
    if (telegramLink) {
      message += `📱 <b>Telegram:</b> <a href="${telegramLink}">${clientInfo.telegramUsername || clientInfo.telegramId}</a>\n`;
    }
    
    message += `🎓 <b>Эксперт:</b> ${expertName}\n`;
    message += `📂 <b>Источник:</b> ${source === 'ai-seller' ? 'ИИ-Продавец' : 'Калькулятор'}\n\n`;

    if (source === 'ai-seller' && aiSellerInfo) {
      message += `<b>═══ Данные ИИ-Продавца ═══</b>\n`;
      if (aiSellerInfo.businessType) message += `🏢 Бизнес: ${aiSellerInfo.businessType}\n`;
      if (aiSellerInfo.classificationResult) message += `📊 Классификация: ${aiSellerInfo.classificationResult}\n`;
      if (aiSellerInfo.selectedPlan) message += `📋 Тариф: ${aiSellerInfo.selectedPlan}\n`;
      if (aiSellerInfo.presentationText) {
        const shortPresentation = aiSellerInfo.presentationText.slice(0, 500);
        message += `\n<b>Презентация:</b>\n<i>${shortPresentation}${aiSellerInfo.presentationText.length > 500 ? '...' : ''}</i>\n`;
      }
    }

    if (source === 'calculator' && calculatorInfo) {
      message += `<b>═══ Данные Калькулятора ═══</b>\n`;
      if (calculatorInfo.company) message += `🏢 Компания: ${calculatorInfo.company}\n`;
      if (calculatorInfo.product) message += `📦 Продукт: ${calculatorInfo.product}\n`;
      if (calculatorInfo.city) message += `🌆 Город: ${calculatorInfo.city}\n`;
      if (calculatorInfo.department) message += `📂 Отдел: ${calculatorInfo.department}\n`;
      if (calculatorInfo.employeeCount) message += `👥 Сотрудников: ${calculatorInfo.employeeCount}\n`;
      if (calculatorInfo.averageSalary) message += `💰 Средняя ЗП: ${calculatorInfo.averageSalary}₽\n`;
      if (calculatorInfo.maintenance) message += `🔧 Обслуживание: ${calculatorInfo.maintenance}\n`;
      if (calculatorInfo.functionality) {
        const shortFunc = calculatorInfo.functionality.slice(0, 300);
        message += `\n<b>ТЗ:</b>\n<i>${shortFunc}${calculatorInfo.functionality.length > 300 ? '...' : ''}</i>\n`;
      }
    }

    // Add direct contact info at the bottom
    if (telegramLink) {
      message += `\n<b>💬 Связаться:</b> <a href="${telegramLink}">Открыть чат</a>`;
    }

    console.log("Sending message to expert chat:", TELEGRAM_EXPERT_CHAT_ID);

    // Send message via Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_EXPERT_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const telegramResult = await telegramResponse.json();
    console.log("Telegram API response:", JSON.stringify(telegramResult));

    if (telegramResult.ok) {
      console.log("Expert notification sent successfully");
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: telegramResult.result.message_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Telegram API error:", telegramResult.description);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send expert notification", 
          details: telegramResult.description,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-expert-selection:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

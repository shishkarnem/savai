import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TextFormat = 'normal' | 'bold' | 'italic' | 'code' | 'mono' | 'quote' | 'link' | 'inline_button' | 'inline_button_link';

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
  messageSettings?: any; // legacy, now loaded from DB
}

function cleanTelegramText(text: string): string {
  // Remove MarkdownV2 escapes and clean up for HTML parse mode
  return text
    .replace(/\\([_*\[\]()~`>#+\-=|{}.!])/g, '$1')
    .replace(/\\/g, '');
}

function formatValue(format: TextFormat, value: string, buttonText?: string): string {
  if (!value || value === 'null' || value === 'undefined') return '';
  
  // Clean escaped text
  const cleanValue = cleanTelegramText(value);
  
  // Truncate very long values like last_100_messages
  const maxLen = 2000;
  const truncatedValue = cleanValue.length > maxLen 
    ? cleanValue.substring(0, maxLen) + '...[обрезано]' 
    : cleanValue;
  
  switch (format) {
    case 'bold': return `<b>${truncatedValue}</b>`;
    case 'italic': return `<i>${truncatedValue}</i>`;
    case 'code': return `<code>${truncatedValue}</code>`;
    case 'mono': return `<pre>${truncatedValue}</pre>`;
    case 'quote': return `<blockquote>${truncatedValue}</blockquote>`;
    case 'link': return `<a href="${truncatedValue}">${truncatedValue}</a>`;
    case 'inline_button': return truncatedValue;
    case 'inline_button_link': return truncatedValue;
    default: return truncatedValue;
  }
}

function getFieldValue(
  key: string,
  clientInfo: NotifyExpertSelectionRequest['clientInfo'],
  calculatorInfo: NotifyExpertSelectionRequest['calculatorInfo'],
  aiSellerInfo: NotifyExpertSelectionRequest['aiSellerInfo'],
  expertInfo: NotifyExpertSelectionRequest['expert'],
  clientDbData?: Record<string, string | null> | null
): string | null {
  let telegramLink = "";
  if (clientInfo.telegramUsername) {
    telegramLink = `https://t.me/${clientInfo.telegramUsername.replace('@', '')}`;
  } else if (clientInfo.telegramId) {
    telegramLink = `tg://user?id=${clientInfo.telegramId}`;
  }

  // First check DB client data for any field
  if (clientDbData && key in clientDbData && clientDbData[key]) {
    // For special fields, still use computed values
    if (!['full_name', 'telegram_link', 'selected_expert', 'expert_name', 'expert_pseudonym', 'business_type', 'classification_result'].includes(key)) {
      return clientDbData[key];
    }
  }

  const valueMap: Record<string, string | null> = {
    full_name: clientInfo.fullName || [clientInfo.firstName, clientInfo.lastName].filter(Boolean).join(' ') || clientDbData?.full_name || null,
    telegram_link: telegramLink || null,
    telegram_id: clientInfo.telegramId,
    telegram_client: clientInfo.telegramUsername || clientDbData?.telegram_client || null,
    city: calculatorInfo?.city || clientDbData?.city || null,
    project: clientDbData?.project || null,
    product: calculatorInfo?.product || clientDbData?.product || null,
    department: calculatorInfo?.department || clientDbData?.department || null,
    employees_count: calculatorInfo?.employeeCount || clientDbData?.employees_count || null,
    functionality: calculatorInfo?.functionality || clientDbData?.functionality || null,
    sav_cost: clientDbData?.sav_cost || null,
    tariff: aiSellerInfo?.selectedPlan || clientDbData?.tariff || null,
    avg_salary: calculatorInfo?.averageSalary || clientDbData?.avg_salary || null,
    selected_expert: `${expertInfo.greeting || ''}${expertInfo.pseudonym || ''}`,
    expert_name: expertInfo.pseudonym,
    expert_pseudonym: expertInfo.pseudonym,
    business_type: aiSellerInfo?.businessType || null,
    classification_result: aiSellerInfo?.classificationResult || null,
    company: calculatorInfo?.company || clientDbData?.project || null,
    maintenance: calculatorInfo?.maintenance || null,
    last_message: clientDbData?.last_message || null,
    last_100_messages: clientDbData?.last_100_messages || null,
    channel: clientDbData?.channel || null,
    status: clientDbData?.status || null,
    comment: clientDbData?.comment || null,
    payback: clientDbData?.payback || null,
    service_price: clientDbData?.service_price || null,
    ai_employee_cost: clientDbData?.ai_employee_cost || null,
    protalk_name: clientDbData?.protalk_name || null,
    protalk_id: clientDbData?.protalk_id || null,
    contract_ooo_url: clientDbData?.contract_ooo_url || null,
    contract_ip_url: clientDbData?.contract_ip_url || null,
    project_plan_url: clientDbData?.project_plan_url || null,
    region_salary: clientDbData?.region_salary || null,
    real_salary: clientDbData?.real_salary || null,
    software_price: clientDbData?.software_price || null,
    ai_tokens_price: clientDbData?.ai_tokens_price || null,
    refund_amount: clientDbData?.refund_amount || null,
    service: clientDbData?.service || null,
    service_type: clientDbData?.service_type || null,
    calculator_date: clientDbData?.calculator_date || null,
    start_date: clientDbData?.start_date || null,
    tariff_date: clientDbData?.tariff_date || null,
    expert_date: clientDbData?.expert_date || null,
    payment_date: clientDbData?.payment_date || null,
    bot_token: clientDbData?.bot_token || null,
    script_id: clientDbData?.script_id || null,
    kp_text: clientDbData?.kp_text || null,
    department_text: clientDbData?.department_text || null,
    software_text: clientDbData?.software_text || null,
    project_code: clientDbData?.project_code || null,
  };

  return valueMap[key] || null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_EXPERT_CHAT_ID = Deno.env.get("TELEGRAM_EXPERT_CHAT_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_EXPERT_CHAT_ID) {
      console.error("Telegram credentials not configured");
      return new Response(
        JSON.stringify({ error: "Telegram credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: NotifyExpertSelectionRequest = await req.json();
    console.log("Received expert selection notification:", JSON.stringify(data));

    const { expert, clientInfo, aiSellerInfo, calculatorInfo, source } = data;

    // Try to load notification template and client data from DB
    let template: any = null;
    let clientDbData: Record<string, string | null> | null = null;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Load template
      const { data: templateData } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("type", "expert_selection")
        .eq("is_active", true)
        .maybeSingle();

      if (templateData) {
        template = templateData;
        console.log("Using DB template:", templateData.name);
      }

      // Load client data from clients table
      if (clientInfo.telegramId) {
        const { data: clientRecord } = await supabase
          .from("clients")
          .select("*")
          .eq("telegram_id", clientInfo.telegramId)
          .maybeSingle();

        if (clientRecord) {
          clientDbData = clientRecord as Record<string, string | null>;
          console.log("Found client in DB:", clientRecord.full_name || clientInfo.telegramId);
        }
      }
    }

    let message = '';
    const inlineButtons: Array<{ text: string; url?: string; callback_data?: string }> = [];

    if (template && template.fields) {
      // Use template from DB
      const fields = template.fields as any[];

      if (template.header_text) {
        message += template.header_text + '\n\n';
      }

      const categoryLabels: Record<string, string> = {
        client: '👤 Клиент',
        project: '📂 Проект',
        finance: '💰 Финансы',
        expert: '🎓 Эксперт',
        dates: '📅 Даты',
        protalk: '🤖 ProTalk',
        documents: '📎 Документы',
        other: '📌 Другое',
      };

      const categories = ['client', 'project', 'finance', 'expert', 'dates', 'protalk', 'documents', 'other'];

      for (const category of categories) {
        const categoryFields = fields.filter((f: any) => f.enabled && f.category === category);
        if (categoryFields.length === 0) continue;

        const fieldLines: string[] = [];

        for (const field of categoryFields) {
          const value = getFieldValue(field.key, clientInfo, calculatorInfo, aiSellerInfo, expert, clientDbData);
          if (!value) continue;

          if (field.format === 'inline_button' || field.format === 'inline_button_link') {
            if (field.format === 'inline_button_link' && value.startsWith('http')) {
              inlineButtons.push({ text: field.buttonText || field.label, url: value });
            }
            continue;
          }

          const formattedValue = formatValue(field.format, value, field.buttonText);
          if (formattedValue) {
            fieldLines.push(`  • ${field.label}: ${formattedValue}`);
          }
        }

        if (fieldLines.length > 0) {
          message += `${categoryLabels[category]}:\n`;
          message += fieldLines.join('\n') + '\n\n';
        }
      }

      if (template.footer_text) {
        message += template.footer_text;
      }
    } else {
      // Default message format (fallback when no DB template)
      const expertName = `${expert.greeting || ''}${expert.pseudonym || 'Неизвестный'}`;
      const clientName = clientInfo.fullName ||
        [clientInfo.firstName, clientInfo.lastName].filter(Boolean).join(' ') ||
        'Клиент';

      let telegramLink = "";
      if (clientInfo.telegramUsername) {
        telegramLink = `https://t.me/${clientInfo.telegramUsername.replace('@', '')}`;
      } else if (clientInfo.telegramId) {
        telegramLink = `tg://user?id=${clientInfo.telegramId}`;
      }

      message = `🎯 <b>Новый выбор эксперта!</b>\n\n`;
      message += `👤 <b>Клиент:</b> ${clientName}\n`;

      if (telegramLink) {
        message += `📱 <b>Telegram:</b> <a href="${telegramLink}">${clientInfo.telegramUsername || clientInfo.telegramId}</a>\n`;
      }

      message += `🎓 <b>Эксперт:</b> ${expertName}\n`;
      message += `📂 <b>Источник:</b> ${source === 'ai-seller' ? 'ИИ-Продавец' : 'Калькулятор'}\n\n`;

      if (source === 'ai-seller' && aiSellerInfo) {
        if (aiSellerInfo.businessType) message += `🏢 Бизнес: ${aiSellerInfo.businessType}\n`;
        if (aiSellerInfo.classificationResult) message += `📊 Классификация: ${aiSellerInfo.classificationResult}\n`;
        if (aiSellerInfo.selectedPlan) message += `📋 Тариф: ${aiSellerInfo.selectedPlan}\n`;
      }

      if (source === 'calculator' && calculatorInfo) {
        if (calculatorInfo.company) message += `🏢 Компания: ${calculatorInfo.company}\n`;
        if (calculatorInfo.product) message += `📦 Продукт: ${calculatorInfo.product}\n`;
        if (calculatorInfo.city) message += `🌆 Город: ${calculatorInfo.city}\n`;
        if (calculatorInfo.employeeCount) message += `👥 Сотрудников: ${calculatorInfo.employeeCount}\n`;
        if (calculatorInfo.averageSalary) message += `💰 Средняя ЗП: ${calculatorInfo.averageSalary}₽\n`;
      }

      if (telegramLink) {
        message += `\n<b>💬 Связаться:</b> <a href="${telegramLink}">Открыть чат</a>`;
      }
    }

    console.log("Sending message to expert chat, length:", message.length);

    const requestBody: Record<string, unknown> = {
      chat_id: TELEGRAM_EXPERT_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    if (inlineButtons.length > 0) {
      requestBody.reply_markup = {
        inline_keyboard: inlineButtons.map(btn => [btn]),
      };
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const telegramResult = await telegramResponse.json();
    console.log("Telegram API response:", JSON.stringify(telegramResult));

    if (telegramResult.ok) {
      return new Response(
        JSON.stringify({ success: true, messageId: telegramResult.result.message_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Telegram API error:", telegramResult.description);
      return new Response(
        JSON.stringify({ error: "Failed to send", details: telegramResult.description }),
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
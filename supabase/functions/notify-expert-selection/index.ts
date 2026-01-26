import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Text formatting types matching frontend
type TextFormat = 'normal' | 'bold' | 'italic' | 'code' | 'mono' | 'quote' | 'link' | 'inline_button' | 'inline_button_link';

interface MessageField {
  key: string;
  label: string;
  enabled: boolean;
  format: TextFormat;
  category: string;
  buttonText?: string;
}

interface MessageConstructorSettings {
  fields: MessageField[];
  headerText: string;
  footerText: string;
}

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
  messageSettings?: MessageConstructorSettings;
}

// Format value according to format type
function formatValue(format: TextFormat, value: string, buttonText?: string): string {
  if (!value || value === 'null' || value === 'undefined') return '';
  
  switch (format) {
    case 'bold': return `<b>${value}</b>`;
    case 'italic': return `<i>${value}</i>`;
    case 'code': return `<code>${value}</code>`;
    case 'mono': return `<pre>${value}</pre>`;
    case 'quote': return `<blockquote>${value}</blockquote>`;
    case 'link': return `<a href="${value}">${value}</a>`;
    case 'inline_button': return value; // handled separately
    case 'inline_button_link': return value; // handled separately
    default: return value;
  }
}

// Get value from data sources by field key
function getFieldValue(
  key: string, 
  clientInfo: NotifyExpertSelectionRequest['clientInfo'],
  calculatorInfo: NotifyExpertSelectionRequest['calculatorInfo'],
  aiSellerInfo: NotifyExpertSelectionRequest['aiSellerInfo'],
  expertInfo: NotifyExpertSelectionRequest['expert']
): string | null {
  // Build telegram link
  let telegramLink = "";
  if (clientInfo.telegramUsername) {
    telegramLink = `https://t.me/${clientInfo.telegramUsername.replace('@', '')}`;
  } else if (clientInfo.telegramId) {
    telegramLink = `tg://user?id=${clientInfo.telegramId}`;
  }

  // Map keys to values
  const valueMap: Record<string, string | null> = {
    // Client info
    full_name: clientInfo.fullName || [clientInfo.firstName, clientInfo.lastName].filter(Boolean).join(' ') || null,
    telegram_link: telegramLink || null,
    telegram_id: clientInfo.telegramId,
    telegram_client: clientInfo.telegramUsername,
    city: calculatorInfo?.city || null,
    
    // Project info
    project: null,
    project_code: null,
    product: calculatorInfo?.product || null,
    department: calculatorInfo?.department || null,
    department_text: null,
    employees_count: calculatorInfo?.employeeCount || null,
    functionality: calculatorInfo?.functionality || null,
    service: null,
    service_type: null,
    kp_text: null,
    software_text: null,
    
    // Finance
    sav_cost: null,
    tariff: aiSellerInfo?.selectedPlan || null,
    avg_salary: calculatorInfo?.averageSalary || null,
    region_salary: null,
    real_salary: null,
    ai_employee_cost: null,
    ai_tokens_price: null,
    service_price: null,
    software_price: null,
    payback: null,
    refund_amount: null,
    
    // Expert
    selected_expert: `${expertInfo.greeting || ''}${expertInfo.pseudonym || ''}`,
    expert_name: expertInfo.pseudonym,
    expert_pseudonym: expertInfo.pseudonym,
    
    // AI Seller specific
    business_type: aiSellerInfo?.businessType || null,
    classification_result: aiSellerInfo?.classificationResult || null,
    presentation_text: aiSellerInfo?.presentationText || null,
    
    // Calculator specific
    company: calculatorInfo?.company || null,
    maintenance: calculatorInfo?.maintenance || null,
  };
  
  return valueMap[key] || null;
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

    const { expert, clientInfo, aiSellerInfo, calculatorInfo, source, messageSettings } = data;

    // Build message based on constructor settings
    let message = '';
    const inlineButtons: Array<{ text: string; url?: string; callback_data?: string }> = [];

    if (messageSettings && messageSettings.fields) {
      // Use message constructor settings
      if (messageSettings.headerText) {
        message += messageSettings.headerText + '\n\n';
      }

      // Group enabled fields by category
      const categories = ['client', 'project', 'finance', 'expert', 'dates', 'protalk', 'documents', 'other'];
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

      for (const category of categories) {
        const categoryFields = messageSettings.fields.filter(f => f.enabled && f.category === category);
        if (categoryFields.length === 0) continue;

        const fieldLines: string[] = [];
        
        for (const field of categoryFields) {
          const value = getFieldValue(field.key, clientInfo, calculatorInfo, aiSellerInfo, expert);
          if (!value) continue;

          // Handle inline buttons separately
          if (field.format === 'inline_button' || field.format === 'inline_button_link') {
            if (field.format === 'inline_button_link' && value.startsWith('http')) {
              inlineButtons.push({
                text: field.buttonText || field.label,
                url: value,
              });
            } else {
              inlineButtons.push({
                text: field.buttonText || field.label,
                callback_data: field.key,
              });
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

      if (messageSettings.footerText) {
        message += messageSettings.footerText;
      }
    } else {
      // Default message format (fallback)
      const expertName = `${expert.greeting || ''}${expert.pseudonym || 'Неизвестный'}`;
      const clientName = clientInfo.fullName || 
        [clientInfo.firstName, clientInfo.lastName].filter(Boolean).join(' ') || 
        'Клиент';

      // Build Telegram link
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
    }

    console.log("Sending message to expert chat:", TELEGRAM_EXPERT_CHAT_ID);
    console.log("Message length:", message.length);

    // Build request body
    const requestBody: Record<string, unknown> = {
      chat_id: TELEGRAM_EXPERT_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    // Add inline keyboard if there are buttons
    if (inlineButtons.length > 0) {
      requestBody.reply_markup = {
        inline_keyboard: inlineButtons.map(btn => [btn]),
      };
    }

    // Send message via Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
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

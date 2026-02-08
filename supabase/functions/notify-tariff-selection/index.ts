import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Text formatting helper
function formatValue(format: string, value: string, buttonText?: string): string {
  if (!value || value === 'null' || value === 'undefined') return '';
  switch (format) {
    case 'bold': return `<b>${value}</b>`;
    case 'italic': return `<i>${value}</i>`;
    case 'code': return `<code>${value}</code>`;
    case 'mono': return `\`\`\`\n${value}\n\`\`\``;
    case 'quote': return `<blockquote>${value}</blockquote>`;
    case 'link': return `<a href="${value}">${value}</a>`;
    case 'inline_button': return value;
    case 'inline_button_link': return value;
    default: return value;
  }
}

interface NotifyTariffRequest {
  tariffName: string;
  paymentType: string;
  clientInfo: {
    telegramId: string | null;
    telegramUsername: string | null;
    fullName: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  businessInfo?: {
    type: string | null;
    classification: string | null;
    businessDescription: string | null;
  };
  currentStep?: string | null;
  selectedTariff?: string | null;
  tariffPrice?: string | null;
  tariffDescription?: string | null;
  paymentModel?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_EXPERT_CHAT_ID = Deno.env.get("TELEGRAM_EXPERT_CHAT_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_EXPERT_CHAT_ID) {
      throw new Error("Telegram credentials not configured");
    }

    const data: NotifyTariffRequest = await req.json();
    console.log("Tariff selection notification:", JSON.stringify(data));

    const { tariffName, paymentType, clientInfo, businessInfo } = data;

    // Try to load notification template from DB
    let template: any = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: templateData } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("type", "tariff_selection")
        .eq("is_active", true)
        .maybeSingle();
      
      if (templateData) {
        template = templateData;
        console.log("Using DB template:", templateData.name);
      }
    }

    // Build telegram link
    let telegramLink = "";
    if (clientInfo.telegramUsername) {
      telegramLink = `https://t.me/${clientInfo.telegramUsername.replace('@', '')}`;
    } else if (clientInfo.telegramId) {
      telegramLink = `tg://user?id=${clientInfo.telegramId}`;
    }

    // Payment label
    const paymentLabel = paymentType === 'monthly' ? 'Ежемесячный' 
      : paymentType === 'onetime' ? 'Единоразовый' 
      : 'Просмотр';

    let message = '';
    const inlineButtons: Array<{ text: string; url?: string; callback_data?: string }> = [];

    if (template && template.fields) {
      // Parse fields: can be array (old format) or object with fieldsList (new format)
      const rawFields = template.fields;
      let fields: any[] = [];
      let templateInlineButtons: any[] = [];

      if (Array.isArray(rawFields)) {
        fields = rawFields;
      } else if (rawFields && typeof rawFields === 'object') {
        fields = (rawFields as any).fieldsList || [];
        templateInlineButtons = (rawFields as any).inlineButtons || [];
      }

      console.log("Parsed fields count:", fields.length, "inline buttons:", templateInlineButtons.length);

      if (template.header_text) {
        message += template.header_text + '\n\n';
      }

      // Build value map for template fields
      const valueMap: Record<string, string | null> = {
        full_name: clientInfo.fullName,
        first_name: clientInfo.firstName || null,
        last_name: clientInfo.lastName || null,
        telegram_link: telegramLink || null,
        telegram_id: clientInfo.telegramId,
        telegram_client: clientInfo.telegramUsername,
        tariff: tariffName,
        business_type: businessInfo?.type || null,
        classification_result: businessInfo?.classification || null,
        business_description: businessInfo?.businessDescription || null,
        current_step: data.currentStep || tariffName,
        selected_tariff: data.selectedTariff || null,
        tariff_price: data.tariffPrice || null,
        tariff_description: data.tariffDescription || null,
        payment_model: data.paymentModel || paymentLabel,
      };

      const enabledFields = fields.filter((f: any) => f.enabled);
      for (const field of enabledFields) {
        const value = valueMap[field.key];
        if (!value) continue;

        if (field.format === 'inline_button' || field.format === 'inline_button_link') {
          if (field.format === 'inline_button_link' && value.startsWith('http')) {
            inlineButtons.push({ text: field.buttonText || field.label, url: value });
          }
          continue;
        }

        const formattedValue = formatValue(field.format, value, field.buttonText);
        if (formattedValue) {
          message += `  • ${field.label}: ${formattedValue}\n`;
        }
      }

      // Add template inline buttons
      for (const row of templateInlineButtons) {
        if (row.buttons) {
          for (const btn of row.buttons) {
            if (btn.type === 'link' && btn.url) {
              inlineButtons.push({ text: btn.text, url: btn.url });
            } else if (btn.type === 'webapp' && btn.url) {
              inlineButtons.push({ text: btn.text, url: btn.url });
            }
          }
        }
      }

      // Always add payment info if not in template
      if (!enabledFields.some((f: any) => f.key === 'payment_model')) {
        message += `\n💳 <b>Действие:</b> ${paymentLabel}\n`;
      }

      if (template.footer_text) {
        message += '\n' + template.footer_text;
      }
    } else {
      // Default message format
      message = `📋 <b>Действие в ИИ-Продавце!</b>\n\n`;
      message += `📍 <b>Шаг:</b> ${data.currentStep || tariffName}\n`;
      message += `👤 <b>Клиент:</b> ${clientInfo.fullName || 'Не указано'}\n`;
      
      if (telegramLink) {
        message += `📱 <b>Telegram:</b> <a href="${telegramLink}">${clientInfo.telegramUsername || clientInfo.telegramId}</a>\n`;
      }
      
      if (businessInfo?.businessDescription) {
        message += `\n📝 <b>Чем занимается:</b> ${businessInfo.businessDescription}\n`;
      }
      
      if (businessInfo?.type) {
        message += `🏢 <b>Бизнес:</b> ${businessInfo.type}\n`;
      }
      if (businessInfo?.classification) {
        message += `📊 <b>Классификация:</b> ${businessInfo.classification}\n`;
      }

      if (data.selectedTariff) {
        message += `\n📦 <b>Тариф:</b> ${data.selectedTariff}\n`;
      }
      if (data.tariffPrice) {
        message += `💰 <b>Стоимость:</b> ${data.tariffPrice}\n`;
      }
      if (data.tariffDescription) {
        const desc = data.tariffDescription.length > 200 
          ? data.tariffDescription.substring(0, 200) + '...' 
          : data.tariffDescription;
        message += `📄 <b>Описание:</b> ${desc}\n`;
      }
      
      message += `\n💳 <b>Модель оплаты:</b> ${data.paymentModel || paymentLabel}\n`;
    }

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
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

    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const telegramResult = await telegramResponse.json();
    console.log("Telegram response:", JSON.stringify(telegramResult));

    // Save to database
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("tariff_notifications").insert({
        telegram_id: clientInfo.telegramId ? parseInt(clientInfo.telegramId) : null,
        telegram_username: clientInfo.telegramUsername,
        tariff_name: tariffName,
        payment_type: paymentType,
        notification_sent: telegramResult.ok,
        message_id: telegramResult.result?.message_id || null,
      });
    }

    if (telegramResult.ok) {
      return new Response(
        JSON.stringify({ success: true, messageId: telegramResult.result.message_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(telegramResult.description || "Telegram API error");
    }
  } catch (error) {
    console.error("Error in notify-tariff-selection:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

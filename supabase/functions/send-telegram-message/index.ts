import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MediaAttachment {
  id: string;
  type: 'photo' | 'video' | 'document' | 'album' | 'video_note' | 'audio';
  url: string;
  caption?: string;
}

interface InlineButton {
  id: string;
  type: 'text' | 'link' | 'webapp';
  text: string;
  url?: string;
  callbackData?: string;
  style?: 'default' | 'primary' | 'success' | 'danger';
}

interface InlineButtonRow {
  id: string;
  buttons: InlineButton[];
}

interface SendMessageRequest {
  clientId: string;
  telegramId: string;
  message: string;
  media?: MediaAttachment[];
  useMediaCaption?: boolean;
  inlineButtons?: InlineButtonRow[];
  disableWebPagePreview?: boolean;
}

/** Strip HTML tags from text (for button labels) */
function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

function buildReplyMarkup(inlineButtons?: InlineButtonRow[]) {
  if (!inlineButtons || inlineButtons.length === 0) return undefined;
  return {
    inline_keyboard: inlineButtons.map(row =>
      row.buttons.map(btn => {
        // Strip HTML from button text — Telegram buttons don't support formatting
        const base: Record<string, unknown> = { text: stripHtml(btn.text) };
        if (btn.style && btn.style !== 'default') {
          base.style = btn.style;
        }
        if (btn.type === 'link' && btn.url) {
          base.url = btn.url;
        } else if (btn.type === 'webapp' && btn.url) {
          base.web_app = { url: btn.url };
        } else {
          base.callback_data = btn.callbackData || 'noop';
        }
        return base;
      })
    ),
  };
}

async function sendTelegramRequest(token: string, method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Telegram bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clientId, telegramId, message, media, useMediaCaption, inlineButtons, disableWebPagePreview }: SendMessageRequest = await req.json();
    const replyMarkup = buildReplyMarkup(inlineButtons);

    console.log(`Sending to ${telegramId} | Client: ${clientId} | Msg: ${message?.substring(0, 50)}... | Media: ${media?.length || 0}`);

    if (!telegramId || !clientId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: clientId, telegramId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Separate media by type
    const validMedia = (media || []).filter(m => m.url?.trim());
    const specialMedia = validMedia.filter(m => m.type === 'video_note' || m.type === 'audio');
    const standardMedia = validMedia.filter(m => m.type !== 'video_note' && m.type !== 'audio');
    const hasStandardMedia = standardMedia.length > 0;
    const hasSpecialMedia = specialMedia.length > 0;
    const hasText = !!message?.trim();

    if (!hasText && !hasStandardMedia && !hasSpecialMedia) {
      return new Response(
        JSON.stringify({ error: "Either message or media is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create message record
    const messageText = message || (hasStandardMedia || hasSpecialMedia ? '[Медиафайл]' : '');
    const { data: messageRecord, error: insertError } = await supabase
      .from("client_messages")
      .insert({
        client_id: clientId,
        telegram_id: telegramId,
        direction: "outgoing",
        message: messageText,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create message record", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let telegramResult: { ok: boolean; result?: { message_id: number }; description?: string } = { ok: false };
    let buttonsAttached = false;

    try {
      // 1. Send special media (video_note, audio) — no buttons, no caption for video_note
      for (const m of specialMedia) {
        const methodMap: Record<string, { method: string; field: string }> = {
          video_note: { method: 'sendVideoNote', field: 'video_note' },
          audio: { method: 'sendAudio', field: 'audio' },
        };
        const { method, field } = methodMap[m.type] || { method: 'sendDocument', field: 'document' };
        const body: Record<string, unknown> = { chat_id: telegramId, [field]: m.url };
        
        // Audio supports caption, video_note does not
        if (m.type === 'audio' && useMediaCaption && hasText && message!.length <= 1000) {
          body.caption = message;
          body.parse_mode = 'HTML';
        }
        
        const result = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, method, body);
        if (!(result as any).ok) {
          console.error(`Special media error (${m.type}):`, (result as any).description);
        } else {
          telegramResult = result as any;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      // 2. Send standard media (photo, video, document)
      if (hasStandardMedia) {
        if (standardMedia.length > 1) {
          // Media group (album)
          const mediaGroup = standardMedia.map((m, index) => {
            const mediaItem: Record<string, string> = {
              type: m.type === 'document' ? 'document' : m.type === 'video' ? 'video' : 'photo',
              media: m.url,
            };
            if (index === 0 && useMediaCaption && hasText) {
              mediaItem.caption = message!;
              mediaItem.parse_mode = 'HTML';
            }
            return mediaItem;
          });

          telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMediaGroup', {
            chat_id: telegramId,
            media: mediaGroup,
          }) as any;

          // After album: send text (if not caption) OR buttons as separate message
          if (!useMediaCaption && hasText) {
            await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
              chat_id: telegramId,
              text: message,
              parse_mode: "HTML",
              disable_web_page_preview: disableWebPagePreview || false,
              ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
            });
            buttonsAttached = true;
          } else if (replyMarkup) {
            // Buttons only (can't attach to album)
            await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
              chat_id: telegramId,
              text: "⬇️",
              reply_markup: replyMarkup,
            });
            buttonsAttached = true;
          }
        } else {
          // Single media
          const singleMedia = standardMedia[0];
          const methodMap: Record<string, { method: string; field: string }> = {
            photo: { method: 'sendPhoto', field: 'photo' },
            video: { method: 'sendVideo', field: 'video' },
            document: { method: 'sendDocument', field: 'document' },
          };
          const { method, field } = methodMap[singleMedia.type] || methodMap.photo;

          const body: Record<string, unknown> = {
            chat_id: telegramId,
            [field]: singleMedia.url,
          };
          if (useMediaCaption && hasText) {
            body.caption = message;
            body.parse_mode = 'HTML';
          }
          if (replyMarkup) {
            body.reply_markup = replyMarkup;
            buttonsAttached = true;
          }

          telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, method, body) as any;

          // Send text separately if not used as caption
          if (!useMediaCaption && hasText) {
            await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
              chat_id: telegramId,
              text: message,
              parse_mode: "HTML",
              disable_web_page_preview: disableWebPagePreview || false,
              ...(!buttonsAttached && replyMarkup ? { reply_markup: replyMarkup } : {}),
            });
            buttonsAttached = true;
          }
        }
      }

      // 3. Text-only message (no standard media was sent)
      if (!hasStandardMedia && !hasSpecialMedia && hasText) {
        telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: telegramId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: disableWebPagePreview || false,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }) as any;
        buttonsAttached = true;
      } else if (!hasStandardMedia && hasSpecialMedia && hasText && !(specialMedia.some(m => m.type === 'audio') && useMediaCaption && message!.length <= 1000)) {
        // Special media was sent but text wasn't used as caption — send text separately
        telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: telegramId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: disableWebPagePreview || false,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }) as any;
        buttonsAttached = true;
      } else if (!hasStandardMedia && hasSpecialMedia && !hasText) {
        telegramResult = { ok: true };
      }

      // 4. If buttons still not sent
      if (!buttonsAttached && replyMarkup) {
        await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: telegramId,
          text: "⬇️",
          reply_markup: replyMarkup,
        });
      }

      // If only special media was sent and result is still not ok, mark as ok
      if (hasSpecialMedia && !hasStandardMedia && !hasText && !telegramResult.ok) {
        telegramResult = { ok: true };
      }
    } catch (sendErr) {
      const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error("Send error:", errMsg);
      telegramResult = { ok: false, description: errMsg };
    }

    const elapsedMs = Date.now() - startTime;
    const elapsedSec = (elapsedMs / 1000).toFixed(2);

    console.log(`Result: ${telegramResult.ok ? 'OK' : 'FAIL'} | Time: ${elapsedSec}s | ${telegramResult.description || ''}`);

    if (telegramResult.ok) {
      await supabase
        .from("client_messages")
        .update({ 
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", messageRecord.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: messageRecord.id,
          telegramMessageId: telegramResult.result?.message_id,
          elapsedSeconds: parseFloat(elapsedSec),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorMessage = telegramResult.description || "Unknown Telegram error";
      
      await supabase
        .from("client_messages")
        .update({ 
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", messageRecord.id);

      return new Response(
        JSON.stringify({ 
          error: "Failed to send Telegram message", 
          details: errorMessage,
          messageId: messageRecord.id,
          elapsedSeconds: parseFloat(elapsedSec),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error (${(elapsedMs / 1000).toFixed(2)}s):`, errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, elapsedSeconds: elapsedMs / 1000 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MediaAttachment {
  id: string;
  type: 'photo' | 'video' | 'document' | 'album';
  url: string;
  caption?: string;
}

interface TextMediaCommand {
  type: 'photo' | 'video' | 'document' | 'video_note' | 'audio';
  source: string;
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
  textMediaCommands?: TextMediaCommand[];
}

function buildReplyMarkup(inlineButtons?: InlineButtonRow[]) {
  if (!inlineButtons || inlineButtons.length === 0) return undefined;
  return {
    inline_keyboard: inlineButtons.map(row =>
      row.buttons.map(btn => {
        const base: Record<string, unknown> = { text: btn.text };
        // Add style if not default
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

/** Convert markdown-style formatting to HTML if present */
function autoConvertMarkdownToHtml(text: string): string {
  let result = text;
  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  result = result.replace(/__(.+?)__/g, '<b>$1</b>');
  // Italic: *text* (not inside tags)
  result = result.replace(/(?<![<\w])_([^_\n]+?)_(?![>\w])/g, '<i>$1</i>');
  result = result.replace(/(?<![<\w])\*([^*\n]+?)\*(?![>\w])/g, '<i>$1</i>');
  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Inline code: `text`
  result = result.replace(/`([^`\n]+?)`/g, '<code>$1</code>');
  // Code block: ```text```
  result = result.replace(/```\n?([\s\S]*?)\n?```/g, '<pre>$1</pre>');
  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return result;
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

    const { clientId, telegramId, message, media, useMediaCaption, inlineButtons, textMediaCommands }: SendMessageRequest = await req.json();
    const replyMarkup = buildReplyMarkup(inlineButtons);

    // Auto-convert markdown to HTML
    const htmlMessage = message ? autoConvertMarkdownToHtml(message) : message;

    console.log(`Sending to ${telegramId} | Client: ${clientId} | Msg: ${htmlMessage?.substring(0, 50)}... | Media: ${media?.length || 0} | TextMedia: ${textMediaCommands?.length || 0}`);

    if (!telegramId || !clientId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: clientId, telegramId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasMedia = media && media.length > 0 && media.some(m => m.url.trim());
    const hasTextMedia = textMediaCommands && textMediaCommands.length > 0;
    
    if (!htmlMessage && !hasMedia && !hasTextMedia) {
      return new Response(
        JSON.stringify({ error: "Either message or media is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create message record
    const messageText = htmlMessage || (hasMedia || hasTextMedia ? '[Медиафайл]' : '');
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

    try {
      // Handle text media commands (##VIDEO_NOTE:id##, ##AUDIO:url##, etc.)
      if (hasTextMedia) {
        for (const cmd of textMediaCommands!) {
          const methodMap: Record<string, string> = {
            photo: 'sendPhoto',
            video: 'sendVideo',
            document: 'sendDocument',
            video_note: 'sendVideoNote',
            audio: 'sendAudio',
          };
          const fieldMap: Record<string, string> = {
            photo: 'photo',
            video: 'video',
            document: 'document',
            video_note: 'video_note',
            audio: 'audio',
          };
          const method = methodMap[cmd.type] || 'sendDocument';
          const field = fieldMap[cmd.type] || 'document';
          
          const body: Record<string, unknown> = {
            chat_id: telegramId,
            [field]: cmd.source,
          };
          
          // For video_note, no caption support
          if (cmd.type !== 'video_note' && useMediaCaption && htmlMessage && htmlMessage.length <= 1000) {
            body.caption = htmlMessage;
            body.parse_mode = 'HTML';
          }
          
          const result = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, method, body);
          if (!(result as any).ok) {
            console.error(`Text media error (${cmd.type}):`, (result as any).description);
          } else {
            telegramResult = result as any;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }

      // Handle standard media
      if (hasMedia) {
        const validMedia = media!.filter(m => m.url.trim());
        
        if (validMedia.length > 1) {
          const mediaGroup = validMedia.map((m, index) => {
            const mediaItem: Record<string, string> = {
              type: m.type === 'document' ? 'document' : m.type === 'video' ? 'video' : 'photo',
              media: m.url,
            };
            if (index === 0 && useMediaCaption && htmlMessage) {
              mediaItem.caption = htmlMessage;
              mediaItem.parse_mode = 'HTML';
            }
            return mediaItem;
          });

          telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMediaGroup', {
            chat_id: telegramId,
            media: mediaGroup,
          }) as any;
          
          if (!useMediaCaption && htmlMessage) {
            await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
              chat_id: telegramId,
              text: htmlMessage,
              parse_mode: "HTML",
              ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
            });
          } else if (replyMarkup) {
            await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
              chat_id: telegramId,
              text: "⬇️",
              reply_markup: replyMarkup,
            });
          }
        } else {
          const singleMedia = validMedia[0];
          const methodMap: Record<string, { method: string; field: string }> = {
            photo: { method: 'sendPhoto', field: 'photo' },
            video: { method: 'sendVideo', field: 'video' },
            document: { method: 'sendDocument', field: 'document' },
          };
          const { method, field } = methodMap[singleMedia.type] || methodMap.photo;

          telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, method, {
            chat_id: telegramId,
            [field]: singleMedia.url,
            ...(useMediaCaption && htmlMessage ? { caption: htmlMessage, parse_mode: 'HTML' } : {}),
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          }) as any;

          if (!useMediaCaption && htmlMessage) {
            await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
              chat_id: telegramId,
              text: htmlMessage,
              parse_mode: "HTML",
              ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
            });
          }
        }
      } else if (!hasTextMedia) {
        // Text-only message
        telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: telegramId,
          text: htmlMessage,
          parse_mode: "HTML",
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }) as any;
      } else if (htmlMessage && !useMediaCaption) {
        // Text media already sent; send remaining text
        telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: telegramId,
          text: htmlMessage,
          parse_mode: "HTML",
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }) as any;
      } else if (replyMarkup && !htmlMessage) {
        // Only buttons remain
        telegramResult = await sendTelegramRequest(TELEGRAM_BOT_TOKEN, 'sendMessage', {
          chat_id: telegramId,
          text: "⬇️",
          reply_markup: replyMarkup,
        }) as any;
      } else {
        // Mark as ok if text media was sent
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

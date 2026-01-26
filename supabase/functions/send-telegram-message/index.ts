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

interface SendMessageRequest {
  clientId: string;
  telegramId: string;
  message: string;
  media?: MediaAttachment[];
  useMediaCaption?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Telegram bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clientId, telegramId, message, media, useMediaCaption }: SendMessageRequest = await req.json();

    console.log(`Sending message to Telegram ID: ${telegramId}`);
    console.log(`Client ID: ${clientId}`);
    console.log(`Message: ${message?.substring(0, 50)}...`);
    console.log(`Media count: ${media?.length || 0}`);
    console.log(`Use media caption: ${useMediaCaption}`);

    if (!telegramId || !clientId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: clientId, telegramId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if there's either message or media
    const hasMedia = media && media.length > 0 && media.some(m => m.url.trim());
    if (!message && !hasMedia) {
      return new Response(
        JSON.stringify({ error: "Either message or media is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create message record first with pending status
    const messageText = message || (hasMedia ? '[Медиафайл]' : '');
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
      console.error("Error inserting message record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create message record", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Message record created: ${messageRecord.id}`);

    let telegramResult: { ok: boolean; result?: { message_id: number }; description?: string } = { ok: false };

    // Handle media sending
    if (hasMedia) {
      const validMedia = media.filter(m => m.url.trim());
      
      if (validMedia.length > 1) {
        // Send as media group (album)
        const mediaGroup = validMedia.map((m, index) => {
          const mediaItem: Record<string, string> = {
            type: m.type === 'document' ? 'document' : m.type === 'video' ? 'video' : 'photo',
            media: m.url,
          };
          // Caption only on first item if useMediaCaption is true
          if (index === 0 && useMediaCaption && message) {
            mediaItem.caption = message;
            mediaItem.parse_mode = 'HTML';
          }
          return mediaItem;
        });

        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
        const response = await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramId,
            media: mediaGroup,
          }),
        });
        telegramResult = await response.json();
        
        // If not using caption and there's a message, send it separately
        if (!useMediaCaption && message) {
          const textUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
          await fetch(textUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramId,
              text: message,
              parse_mode: "HTML",
            }),
          });
        }
      } else {
        // Send single media
        const singleMedia = validMedia[0];
        let telegramUrl: string;
        let body: Record<string, unknown>;

        switch (singleMedia.type) {
          case 'photo':
            telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
            body = {
              chat_id: telegramId,
              photo: singleMedia.url,
              ...(useMediaCaption && message ? { caption: message, parse_mode: 'HTML' } : {}),
            };
            break;
          case 'video':
            telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`;
            body = {
              chat_id: telegramId,
              video: singleMedia.url,
              ...(useMediaCaption && message ? { caption: message, parse_mode: 'HTML' } : {}),
            };
            break;
          case 'document':
            telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
            body = {
              chat_id: telegramId,
              document: singleMedia.url,
              ...(useMediaCaption && message ? { caption: message, parse_mode: 'HTML' } : {}),
            };
            break;
          default:
            telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
            body = {
              chat_id: telegramId,
              photo: singleMedia.url,
              ...(useMediaCaption && message ? { caption: message, parse_mode: 'HTML' } : {}),
            };
        }

        const response = await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        telegramResult = await response.json();

        // If not using caption and there's a message, send it separately
        if (!useMediaCaption && message) {
          const textUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
          await fetch(textUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramId,
              text: message,
              parse_mode: "HTML",
            }),
          });
        }
      }
    } else {
      // Send text message only
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message,
          parse_mode: "HTML",
        }),
      });
      telegramResult = await response.json();
    }

    console.log("Telegram API response:", JSON.stringify(telegramResult));

    if (telegramResult.ok) {
      // Update message status to sent
      await supabase
        .from("client_messages")
        .update({ 
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", messageRecord.id);

      console.log("Message sent successfully");

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: messageRecord.id,
          telegramMessageId: telegramResult.result?.message_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Update message status to failed
      const errorMessage = telegramResult.description || "Unknown Telegram error";
      
      await supabase
        .from("client_messages")
        .update({ 
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", messageRecord.id);

      console.error("Telegram API error:", errorMessage);

      return new Response(
        JSON.stringify({ 
          error: "Failed to send Telegram message", 
          details: errorMessage,
          messageId: messageRecord.id,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-telegram-message:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

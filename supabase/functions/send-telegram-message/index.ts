import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  clientId: string;
  telegramId: string;
  message: string;
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

    const { clientId, telegramId, message }: SendMessageRequest = await req.json();

    console.log(`Sending message to Telegram ID: ${telegramId}`);
    console.log(`Client ID: ${clientId}`);
    console.log(`Message: ${message.substring(0, 50)}...`);

    if (!telegramId || !message || !clientId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: clientId, telegramId, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create message record first with pending status
    const { data: messageRecord, error: insertError } = await supabase
      .from("client_messages")
      .insert({
        client_id: clientId,
        telegram_id: telegramId,
        direction: "outgoing",
        message: message,
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

    // Send message via Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const telegramResult = await telegramResponse.json();
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
          telegramMessageId: telegramResult.result.message_id,
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

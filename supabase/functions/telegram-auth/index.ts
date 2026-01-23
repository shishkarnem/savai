import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telegramUser } = await req.json() as { telegramUser: TelegramUser };

    if (!telegramUser || !telegramUser.id) {
      return new Response(
        JSON.stringify({ error: "Telegram user data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists
    const { data: existingUser, error: selectError } = await supabase
      .from("telegram_profiles")
      .select("*")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (selectError) {
      console.error("Error checking existing user:", selectError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let profile;

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from("telegram_profiles")
        .update({
          first_name: telegramUser.first_name || existingUser.first_name,
          last_name: telegramUser.last_name || existingUser.last_name,
          username: telegramUser.username || existingUser.username,
          photo_url: telegramUser.photo_url || existingUser.photo_url,
        })
        .eq("telegram_id", telegramUser.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      profile = updatedUser;
      console.log("Updated existing Telegram user:", telegramUser.id);
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from("telegram_profiles")
        .insert({
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      profile = newUser;
      console.log("Created new Telegram user:", telegramUser.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile,
        isNewUser: !existingUser 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in telegram-auth function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

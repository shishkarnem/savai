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
    const { telegramUser, referralCode } = await req.json() as { telegramUser: TelegramUser; referralCode?: string | null };

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
      .from("sav_telegram_profiles")
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
      // Update existing user (only set referred_by if not already set)
      const updateData: Record<string, any> = {
        first_name: telegramUser.first_name || existingUser.first_name,
        last_name: telegramUser.last_name || existingUser.last_name,
        username: telegramUser.username || existingUser.username,
        photo_url: telegramUser.photo_url || existingUser.photo_url,
      };
      
      // Only set referred_by on first referral (don't overwrite)
      if (referralCode && !existingUser.referred_by) {
        updateData.referred_by = referralCode;
      }

      const { data: updatedUser, error: updateError } = await supabase
      .from("sav_telegram_profiles")
        .update(updateData)
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
        .from("sav_telegram_profiles")
        .insert({
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
          referred_by: referralCode || null,
          referral_code: String(telegramUser.id),
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

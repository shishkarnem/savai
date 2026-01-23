import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramChat {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo?: {
    small_file_id: string;
    big_file_id: string;
  };
}

interface TelegramFile {
  file_id: string;
  file_path: string;
}

async function getTelegramProfile(botToken: string, telegramId: string): Promise<{
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
} | null> {
  try {
    // Get chat info
    const chatResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${telegramId}`
    );
    
    if (!chatResponse.ok) {
      console.log(`Failed to get chat for ${telegramId}: ${chatResponse.status}`);
      return null;
    }
    
    const chatData = await chatResponse.json();
    
    if (!chatData.ok) {
      console.log(`Telegram API error for ${telegramId}:`, chatData.description);
      return null;
    }
    
    const chat: TelegramChat = chatData.result;
    
    let photoUrl: string | null = null;
    
    // Get profile photo if available
    if (chat.photo?.big_file_id) {
      try {
        const fileResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/getFile?file_id=${chat.photo.big_file_id}`
        );
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          if (fileData.ok && fileData.result?.file_path) {
            photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          }
        }
      } catch (photoError) {
        console.log(`Failed to get photo for ${telegramId}:`, photoError);
      }
    }
    
    return {
      first_name: chat.first_name || null,
      last_name: chat.last_name || null,
      username: chat.username || null,
      photo_url: photoUrl,
    };
  } catch (error) {
    console.error(`Error fetching profile for ${telegramId}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { telegram_id, bulk_sync, limit = 50 } = await req.json();

    // Single profile sync
    if (telegram_id && !bulk_sync) {
      console.log(`Syncing single profile: ${telegram_id}`);
      
      const profile = await getTelegramProfile(botToken, telegram_id);
      
      if (!profile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not fetch profile from Telegram' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const telegramIdNum = parseInt(telegram_id, 10);
      
      // Check if profile exists
      const { data: existing } = await supabase
        .from('telegram_profiles')
        .select('id')
        .eq('telegram_id', telegramIdNum)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('telegram_profiles')
          .update({
            first_name: profile.first_name,
            last_name: profile.last_name,
            username: profile.username,
            photo_url: profile.photo_url,
            updated_at: new Date().toISOString(),
          })
          .eq('telegram_id', telegramIdNum)
          .select()
          .single();

        if (error) {
          console.error('Update error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Updated profile for ${telegram_id}`);
        return new Response(
          JSON.stringify({ success: true, profile: data, action: 'updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('telegram_profiles')
          .insert({
            telegram_id: telegramIdNum,
            first_name: profile.first_name,
            last_name: profile.last_name,
            username: profile.username,
            photo_url: profile.photo_url,
          })
          .select()
          .single();

        if (error) {
          console.error('Insert error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Created profile for ${telegram_id}`);
        return new Response(
          JSON.stringify({ success: true, profile: data, action: 'created' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Bulk sync - get clients without telegram profiles
    if (bulk_sync) {
      console.log(`Starting bulk sync, limit: ${limit}`);

      // Get clients with telegram_id that don't have a profile yet
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('telegram_id')
        .not('telegram_id', 'is', null)
        .limit(limit);

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return new Response(
          JSON.stringify({ success: false, error: clientsError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get existing profiles
      const { data: existingProfiles } = await supabase
        .from('telegram_profiles')
        .select('telegram_id');

      const existingIds = new Set(
        (existingProfiles || []).map(p => p.telegram_id.toString())
      );

      // Filter clients that need sync
      const clientsToSync = clients
        ?.filter(c => c.telegram_id && /^\d+$/.test(c.telegram_id))
        .filter(c => !existingIds.has(c.telegram_id!))
        .slice(0, Math.min(limit, 20)); // Limit to 20 per request to avoid timeouts

      console.log(`Found ${clientsToSync?.length || 0} clients to sync`);

      let synced = 0;
      let failed = 0;
      const results: { telegram_id: string; success: boolean; error?: string }[] = [];

      for (const client of clientsToSync || []) {
        if (!client.telegram_id) continue;

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

        const profile = await getTelegramProfile(botToken, client.telegram_id);
        
        if (profile) {
          const telegramIdNum = parseInt(client.telegram_id, 10);
          
          const { error: insertError } = await supabase
            .from('telegram_profiles')
            .insert({
              telegram_id: telegramIdNum,
              first_name: profile.first_name,
              last_name: profile.last_name,
              username: profile.username,
              photo_url: profile.photo_url,
            });

          if (insertError) {
            console.error(`Failed to insert ${client.telegram_id}:`, insertError);
            failed++;
            results.push({ telegram_id: client.telegram_id, success: false, error: insertError.message });
          } else {
            synced++;
            results.push({ telegram_id: client.telegram_id, success: true });
          }
        } else {
          failed++;
          results.push({ telegram_id: client.telegram_id, success: false, error: 'Could not fetch from Telegram' });
        }
      }

      console.log(`Bulk sync complete: ${synced} synced, ${failed} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          synced,
          failed,
          total: clientsToSync?.length || 0,
          remaining: (clients?.length || 0) - (existingIds.size + synced),
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Missing telegram_id or bulk_sync parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

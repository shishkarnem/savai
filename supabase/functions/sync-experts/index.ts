import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_SHEET_ID = '1ScYSBpSTV-bu-9jxPlktjG15fVZoVtuwYdkWOVkBTDw';

interface ExpertRow {
  sheet_row_id: string;
  description: string | null;
  photo_url: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Google Sheets sync for experts...');
    
    // Query columns N (description) and O (photo_url) - columns are 0-indexed, N=13, O=14
    // Using SQL-like query to get specific columns
    const tq = `SELECT N, O`;
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&tq=${encodeURIComponent(tq)}`;

    console.log('Fetching from Google Sheets...');
    const response = await fetch(url);
    const text = await response.text();
    
    // Google returns a response prefixed with some junk - extract JSON
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/)?.[1];
    if (!jsonStr) {
      console.error('Failed to parse Google Sheets response');
      return new Response(
        JSON.stringify({ error: 'Failed to parse Google Sheets response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = JSON.parse(jsonStr);
    const rows = data.table.rows || [];
    
    console.log(`Found ${rows.length} rows in Google Sheets`);
    
    // Transform rows to expert data
    const experts: ExpertRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const description = row.c?.[0]?.v || null;
      const photoUrl = row.c?.[1]?.v || null;
      
      // Skip empty rows
      if (!description && !photoUrl) {
        continue;
      }
      
      experts.push({
        sheet_row_id: `row_${i + 1}`, // 1-indexed row ID
        description: description,
        photo_url: photoUrl
      });
    }
    
    console.log(`Processed ${experts.length} valid expert entries`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert experts data
    let upsertedCount = 0;
    for (const expert of experts) {
      const { error } = await supabase
        .from('experts')
        .upsert(
          {
            sheet_row_id: expert.sheet_row_id,
            description: expert.description,
            photo_url: expert.photo_url,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'sheet_row_id' }
        );
      
      if (error) {
        console.error(`Error upserting expert ${expert.sheet_row_id}:`, error);
      } else {
        upsertedCount++;
      }
    }

    console.log(`Successfully synced ${upsertedCount} experts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${upsertedCount} experts from Google Sheets`,
        total_rows: rows.length,
        valid_entries: experts.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

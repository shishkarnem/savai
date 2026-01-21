import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_SHEET_ID = '1ScYSBpSTV-bu-9jxPlktjG15fVZoVtuwYdkWOVkBTDw';

interface ExpertRow {
  sheet_row_id: string;
  pseudonym: string | null;      // G
  greeting: string | null;       // H
  tools: string | null;          // I
  spheres: string | null;        // J
  cases: string | null;          // K
  other_info: string | null;     // L
  description: string | null;    // N
  photo_url: string | null;      // O
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Google Sheets sync for experts...');
    
    // Query columns G, H, I, J, K, L, N, O
    // G=6, H=7, I=8, J=9, K=10, L=11, N=13, O=14 (0-indexed)
    const tq = `SELECT G, H, I, J, K, L, N, O`;
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
    // Columns order in SELECT: G, H, I, J, K, L, N, O -> indices 0-7
    const experts: ExpertRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const pseudonym = row.c?.[0]?.v || null;    // G
      const greeting = row.c?.[1]?.v || null;     // H
      const tools = row.c?.[2]?.v || null;        // I
      const spheres = row.c?.[3]?.v || null;      // J
      const cases = row.c?.[4]?.v || null;        // K
      const otherInfo = row.c?.[5]?.v || null;    // L
      const description = row.c?.[6]?.v || null;  // N
      const photoUrl = row.c?.[7]?.v || null;     // O
      
      // Skip empty rows (need at least pseudonym or description)
      if (!pseudonym && !description) {
        continue;
      }
      
      experts.push({
        sheet_row_id: `row_${i + 1}`, // 1-indexed row ID
        pseudonym,
        greeting,
        tools,
        spheres,
        cases,
        other_info: otherInfo,
        description,
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
            pseudonym: expert.pseudonym,
            greeting: expert.greeting,
            tools: expert.tools,
            spheres: expert.spheres,
            cases: expert.cases,
            other_info: expert.other_info,
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

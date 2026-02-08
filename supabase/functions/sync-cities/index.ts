import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheet with cities and salaries
const SHEET_ID = '1ZLx0ohpR2TzuDxYeJITJP8GJ2BmzDC-_bR_bNEDlfzE';

interface CityData {
  name: string;
  avg_salary: number | null;
}

async function fetchCitiesFromSheet(): Promise<CityData[]> {
  // Fetch all data from the sheet
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
  
  console.log('Fetching cities from Google Sheets...');
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }
  
  const text = await response.text();
  
  // Parse the JSONP response
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?$/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Google Sheets response');
  }
  
  const data = JSON.parse(jsonMatch[1]);
  
  if (!data.table || !data.table.rows) {
    throw new Error('No data found in sheet');
  }
  
  const cities: CityData[] = [];
  
  // Log available columns for debugging
  if (data.table.cols) {
    console.log('Sheet columns:', data.table.cols.map((c: any, i: number) => `${i}: ${c.label || c.id}`));
  }
  
  // Process rows - column A is city name, column C (index 2) is salary in rubles
  for (const row of data.table.rows) {
    if (!row.c || !row.c[0]) continue;
    
    const cityName = row.c[0]?.v;
    if (!cityName || typeof cityName !== 'string' || cityName.trim() === '') continue;
    
    // Get salary from column C (index 2) - rubles
    let avgSalary: number | null = null;
    const salaryCell = row.c[2]; // Column C
    if (salaryCell?.v !== undefined && salaryCell?.v !== null) {
      const salaryValue = salaryCell.v;
      if (typeof salaryValue === 'number') {
        avgSalary = Math.round(salaryValue);
      } else if (typeof salaryValue === 'string') {
        // Parse salary - handle locale formats (spaces, commas, dots)
        const cleaned = salaryValue
          .replace(/\s/g, '')
          .replace(/,/g, '.')
          .replace(/[^\d.]/g, '');
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
          avgSalary = Math.round(parsed);
        }
      }
    }
    
    if (avgSalary !== null) {
      console.log(`City: ${cityName.trim()}, Salary: ${avgSalary}`);
    }
    
    cities.push({
      name: cityName.trim(),
      avg_salary: avgSalary,
    });
  }
  
  console.log(`Parsed ${cities.length} cities from sheet`);
  return cities;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch cities from Google Sheet
    const cities = await fetchCitiesFromSheet();
    
    if (cities.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No cities found in sheet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let synced = 0;
    let errors = 0;
    
    // Upsert cities into database
    for (const city of cities) {
      const { error } = await supabase
        .from('cities')
        .upsert(
          {
            name: city.name,
            avg_salary: city.avg_salary,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'name' }
        );
      
      if (error) {
        console.error(`Error upserting city ${city.name}:`, error);
        errors++;
      } else {
        synced++;
      }
    }
    
    console.log(`Sync complete: ${synced} synced, ${errors} errors`);
    
    return new Response(
      JSON.stringify({
        success: true,
        synced,
        errors,
        total: cities.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

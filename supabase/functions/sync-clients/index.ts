import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheet configuration
const SHEET_ID = '11lBGdorFHiz2Gvi_Uuq7s5QMptl19FeTnasPxc6UbSM';
const SHEET_GID = '1240997564';

// Column mapping (0-indexed)
const COLUMN_MAP = {
  project_code: 0,      // A
  telegram_id: 1,       // B
  telegram_client: 2,   // C
  full_name: 3,         // D
  project: 4,           // E
  // F, G skipped
  calculator_date: 7,   // H
  start_date: 8,        // I
  comment: 9,           // J
  status: 10,           // K
  // L skipped
  expert_date: 12,      // M
  expert_name: 13,      // N
  expert_pseudonym: 14, // O
  // P skipped
  tariff_date: 16,      // Q
  tariff: 17,           // R
  send_status: 18,      // S
  reminder_time: 19,    // T
  reminder_text: 20,    // U
  product: 21,          // V
  city: 22,             // W
  department: 23,       // X
  employees_count: 24,  // Y
  contract_ooo_url: 25, // Z
  contract_ip_url: 26,  // AA
  project_plan_url: 27, // AB
  sav_cost: 28,         // AC
  service_price: 29,    // AD
  work_start_date: 30,  // AE
  payment_date: 31,     // AF
  service_start_date: 32, // AG
  rejection_date: 33,   // AH
  refund_amount: 34,    // AI
  work_end_date: 35,    // AJ
  act_date: 36,         // AK
  avg_salary: 37,       // AL
  selected_expert: 38,  // AM
  functionality: 39,    // AN
  service: 40,          // AO
  // AP-BL skipped (41-63)
  region_salary: 64,    // BM
  real_salary: 65,      // BN
  ai_employee_cost: 66, // BO
  service_type: 67,     // BP
  software_price: 68,   // BQ
  ai_tokens_price: 69,  // BR
  payback: 70,          // BS
  software_text: 71,    // BT
  department_text: 72,  // BU
  kp_text: 73,          // BV
  block_date: 74,       // BW
  protalk_name: 75,     // BX
  protalk_id: 76,       // BY
  script_id: 77,        // BZ
  bot_token: 78,        // CA
  last_100_messages: 79, // CB
  last_message: 80,     // CC
  channel: 81,          // CD
  protalk_send_status: 82, // CE
};

// Date columns that need parsing
const DATE_COLUMNS = [
  'calculator_date', 'start_date', 'expert_date', 'tariff_date',
  'work_start_date', 'payment_date', 'service_start_date', 'rejection_date',
  'work_end_date', 'act_date', 'block_date'
];

function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  
  // Try to parse various date formats
  const trimmed = value.trim();
  
  // DD.MM.YYYY format
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY-MM-DD format (already ISO)
  const isoFormat = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoFormat) {
    return trimmed;
  }
  
  // Try native Date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return null;
}

function getValue(row: string[], columnName: string): string | null {
  const index = COLUMN_MAP[columnName as keyof typeof COLUMN_MAP];
  if (index === undefined || index >= row.length) return null;
  const value = row[index];
  if (!value || value.trim() === '') return null;
  return value.trim();
}

function getDateValue(row: string[], columnName: string): string | null {
  const value = getValue(row, columnName);
  if (!value) return null;
  return parseDate(value);
}

async function fetchSheetData(): Promise<string[][]> {
  // Use Google Visualization API to fetch public sheet data
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}`;
  
  console.log('Fetching sheet data from:', url);
  
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
  
  // Convert to 2D array
  const rows: string[][] = data.table.rows.map((row: { c: Array<{ v: any } | null> }) => {
    return row.c.map((cell) => {
      if (!cell || cell.v === null || cell.v === undefined) return '';
      return String(cell.v);
    });
  });
  
  console.log(`Fetched ${rows.length} rows from sheet`);
  return rows;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting clients sync...');
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch data from Google Sheet
    const rows = await fetchSheetData();
    
    if (rows.length === 0) {
      console.log('No data to sync');
      return new Response(
        JSON.stringify({ success: true, message: 'No data to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let synced = 0;
    let errors = 0;

    // Process each row (skip header if present)
    const startRow = rows[0] && rows[0][0] === 'Код проекта' ? 1 : 0;
    
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      
      // Generate unique row ID based on row index
      const sheetRowId = `row_${i + 1}`;
      
      // Skip empty rows (no project code and no telegram_id)
      const projectCode = getValue(row, 'project_code');
      const telegramId = getValue(row, 'telegram_id');
      
      if (!projectCode && !telegramId) {
        continue;
      }

      try {
        const clientData = {
          sheet_row_id: sheetRowId,
          
          // Анкетные данные
          project_code: projectCode,
          telegram_id: telegramId,
          telegram_client: getValue(row, 'telegram_client'),
          full_name: getValue(row, 'full_name'),
          project: getValue(row, 'project'),
          calculator_date: getDateValue(row, 'calculator_date'),
          start_date: getDateValue(row, 'start_date'),
          comment: getValue(row, 'comment'),
          status: getValue(row, 'status'),
          expert_date: getDateValue(row, 'expert_date'),
          expert_name: getValue(row, 'expert_name'),
          expert_pseudonym: getValue(row, 'expert_pseudonym'),
          tariff_date: getDateValue(row, 'tariff_date'),
          tariff: getValue(row, 'tariff'),
          send_status: getValue(row, 'send_status'),
          reminder_time: getValue(row, 'reminder_time'),
          reminder_text: getValue(row, 'reminder_text'),
          
          // Калькулятор
          product: getValue(row, 'product'),
          city: getValue(row, 'city'),
          department: getValue(row, 'department'),
          employees_count: getValue(row, 'employees_count'),
          contract_ooo_url: getValue(row, 'contract_ooo_url'),
          contract_ip_url: getValue(row, 'contract_ip_url'),
          project_plan_url: getValue(row, 'project_plan_url'),
          sav_cost: getValue(row, 'sav_cost'),
          service_price: getValue(row, 'service_price'),
          work_start_date: getDateValue(row, 'work_start_date'),
          payment_date: getDateValue(row, 'payment_date'),
          service_start_date: getDateValue(row, 'service_start_date'),
          rejection_date: getDateValue(row, 'rejection_date'),
          refund_amount: getValue(row, 'refund_amount'),
          work_end_date: getDateValue(row, 'work_end_date'),
          act_date: getDateValue(row, 'act_date'),
          avg_salary: getValue(row, 'avg_salary'),
          selected_expert: getValue(row, 'selected_expert'),
          functionality: getValue(row, 'functionality'),
          service: getValue(row, 'service'),
          region_salary: getValue(row, 'region_salary'),
          real_salary: getValue(row, 'real_salary'),
          ai_employee_cost: getValue(row, 'ai_employee_cost'),
          service_type: getValue(row, 'service_type'),
          software_price: getValue(row, 'software_price'),
          ai_tokens_price: getValue(row, 'ai_tokens_price'),
          payback: getValue(row, 'payback'),
          software_text: getValue(row, 'software_text'),
          department_text: getValue(row, 'department_text'),
          kp_text: getValue(row, 'kp_text'),
          
          // ProTalk
          block_date: getDateValue(row, 'block_date'),
          protalk_name: getValue(row, 'protalk_name'),
          protalk_id: getValue(row, 'protalk_id'),
          script_id: getValue(row, 'script_id'),
          bot_token: getValue(row, 'bot_token'),
          last_100_messages: getValue(row, 'last_100_messages'),
          last_message: getValue(row, 'last_message'),
          channel: getValue(row, 'channel'),
          protalk_send_status: getValue(row, 'protalk_send_status'),
        };

        // Upsert (insert or update)
        const { error } = await supabase
          .from('clients')
          .upsert(clientData, { onConflict: 'sheet_row_id' });

        if (error) {
          console.error(`Error upserting row ${i + 1}:`, error);
          errors++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`Error processing row ${i + 1}:`, err);
        errors++;
      }
    }

    console.log(`Sync completed: ${synced} synced, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Синхронизация завершена`,
        synced,
        errors,
        total: rows.length - startRow,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

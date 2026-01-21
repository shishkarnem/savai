import { GOOGLE_SHEET_ID } from '../constants';
import { PlanData, Sphere, Segment, Category, PlanLevel } from '../types';

// The Google Sheets Visualization API allows SQL-like querying
// We fetch the data as JSON
export async function fetchPlansFromSheet(filters: { sphere: Sphere; segment: Segment; category: Category }): Promise<PlanData[]> {
  const tq = `SELECT A, C, D, E, F, G, H, I WHERE D MATCHES '(?s).*${filters.sphere}.*' AND E = '${filters.segment}' AND F = '${filters.category}'`;
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&tq=${encodeURIComponent(tq)}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    // Google returns a response prefixed with some junk
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/)?.[1];
    if (!jsonStr) return [];
    
    const data = JSON.parse(jsonStr);
    const rows = data.table.rows;
    
    return rows.map((row: any) => ({
      tariffName: row.c[0]?.v || '',
      package: row.c[1]?.v as PlanLevel,
      sphere: row.c[2]?.v as Sphere,
      segment: row.c[3]?.v as Segment,
      category: row.c[4]?.v as Category,
      fullDescription: row.c[5]?.v || '',
      priceMonth: row.c[6]?.v || 0,
      photoUrl: row.c[7]?.v || ''
    }));
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return [];
  }
}

export async function fetchSpecificPlan(filters: { sphere: Sphere; segment: Segment; category: Category; package: PlanLevel }): Promise<PlanData | null> {
  const mask = `SAV AI Продавец ${filters.segment} ${filters.category} ${filters.sphere} ${filters.package}`;
  const tq = `SELECT G, I WHERE A MATCHES '(?s).*${mask}.*'`;
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&tq=${encodeURIComponent(tq)}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/)?.[1];
    if (!jsonStr) return null;
    
    const data = JSON.parse(jsonStr);
    const rows = data.table.rows;
    if (rows.length === 0) return null;

    return {
      tariffName: mask,
      package: filters.package,
      sphere: filters.sphere,
      segment: filters.segment,
      category: filters.category,
      fullDescription: rows[0].c[0]?.v || '',
      priceMonth: 0,
      photoUrl: rows[0].c[1]?.v || ''
    } as PlanData;
  } catch (error) {
    return null;
  }
}

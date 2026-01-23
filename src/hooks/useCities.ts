import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface City {
  id: string;
  name: string;
  avg_salary: number | null;
}

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<City[]> => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, avg_salary')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching cities:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export async function syncCities(): Promise<{ synced: number; errors: number }> {
  const { data, error } = await supabase.functions.invoke('sync-cities');
  
  if (error) {
    console.error('Error syncing cities:', error);
    throw error;
  }
  
  return data;
}

/**
 * Custom hook to fetch and extract unique agency names from daily priorities
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';

export function useAgenciesList() {
  const { supabase } = useSupabase();

  return useQuery({
    queryKey: ['agencies-list'],
    queryFn: async () => {
      // Fetch unique agency names from daily_priorities table
      const { data, error } = await supabase
        .from('daily_priorities')
        .select('agency_name')
        .not('agency_name', 'is', null);

      if (error) throw error;

      // Extract unique agency names
      const agenciesSet = new Set<string>();

      (data || []).forEach(row => {
        if (row.agency_name && row.agency_name.trim()) {
          agenciesSet.add(row.agency_name.trim());
        }
      });

      // Convert to sorted array
      const agencies = Array.from(agenciesSet).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );

      return agencies;
    },
    enabled: !!supabase,
    staleTime: 1 * 60 * 1000, // 1 minute - refresh more frequently for better UX
  });
}

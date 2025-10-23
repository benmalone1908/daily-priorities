/**
 * Custom hook to fetch and extract unique advertiser names from daily priorities
 * Returns both a flat list of all advertisers and a mapping by agency
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';

export function useAdvertisersList() {
  const { supabase } = useSupabase();

  return useQuery({
    queryKey: ['advertisers-list'],
    queryFn: async () => {
      // Fetch unique advertiser and agency combinations from daily_priorities table
      const { data, error } = await supabase
        .from('daily_priorities')
        .select('client_name, agency_name')
        .not('client_name', 'is', null);

      if (error) throw error;

      // Extract unique advertiser names and build agency-to-advertisers mapping
      const advertisersSet = new Set<string>();
      const agencyToAdvertisers = new Map<string, Set<string>>();

      (data || []).forEach(row => {
        const advertiser = row.client_name;
        const agency = row.agency_name;

        if (advertiser && advertiser.trim()) {
          const trimmedAdvertiser = advertiser.trim();
          advertisersSet.add(trimmedAdvertiser);

          // Map agency to advertiser
          if (agency && agency.trim()) {
            const trimmedAgency = agency.trim();
            if (!agencyToAdvertisers.has(trimmedAgency)) {
              agencyToAdvertisers.set(trimmedAgency, new Set());
            }
            agencyToAdvertisers.get(trimmedAgency)!.add(trimmedAdvertiser);
          }
        }
      });

      // Convert to sorted array
      const advertisers = Array.from(advertisersSet).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );

      // Convert Map<string, Set<string>> to Map<string, string[]> with sorted arrays
      const byAgency = new Map<string, string[]>();
      agencyToAdvertisers.forEach((advertisersSet, agency) => {
        const sortedAdvertisers = Array.from(advertisersSet).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        );
        byAgency.set(agency, sortedAdvertisers);
      });

      return { advertisers, byAgency };
    },
    enabled: !!supabase,
    staleTime: 1 * 60 * 1000, // 1 minute - refresh more frequently for better UX
  });
}

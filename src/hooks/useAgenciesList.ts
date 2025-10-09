/**
 * Custom hook to fetch and extract unique agency names from campaign data
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { useCampaignFilter } from '@/contexts/use-campaign-filter';

export function useAgenciesList() {
  const { supabase } = useSupabase();
  const { extractAgencyInfo } = useCampaignFilter();

  return useQuery({
    queryKey: ['agencies-list'],
    queryFn: async () => {
      let allData: { campaign_order_name: string }[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('campaign_data')
          .select('campaign_order_name')
          .range(from, from + pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Get unique campaign names first
      const uniqueCampaigns = [...new Set(allData.map(row => row.campaign_order_name))];

      // Extract unique agency names
      const agenciesSet = new Set<string>();

      uniqueCampaigns.forEach(campaignName => {
        const { agency } = extractAgencyInfo(campaignName);
        if (agency && agency.trim()) {
          agenciesSet.add(agency.trim());
        }
      });

      // Convert to sorted array
      const agencies = Array.from(agenciesSet).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );

      return agencies;
    },
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes - agencies don't change often
  });
}

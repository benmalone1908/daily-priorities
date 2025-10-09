/**
 * Custom hook to fetch and extract unique advertiser names from campaign data
 * Returns both a flat list of all advertisers and a mapping by agency
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { useCampaignFilter } from '@/contexts/use-campaign-filter';

export function useAdvertisersList() {
  const { supabase } = useSupabase();
  const { extractAdvertiserName, extractAgencyInfo } = useCampaignFilter();

  return useQuery({
    queryKey: ['advertisers-list'],
    queryFn: async () => {
      // Fetch ALL campaign data rows
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

      // Extract unique advertiser names and build agency-to-advertisers mapping
      const advertisersSet = new Set<string>();
      const agencyToAdvertisers = new Map<string, Set<string>>();

      uniqueCampaigns.forEach(campaignName => {
        const advertiser = extractAdvertiserName(campaignName);
        const { agency } = extractAgencyInfo(campaignName);

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
    staleTime: 5 * 60 * 1000, // 5 minutes - advertisers don't change often
  });
}

/**
 * Custom hook to fetch and extract unique agency names from both campaign data and daily priorities
 *
 * This hook queries two sources:
 * 1. campaign_data table - extracts agencies from 67k+ campaign names using regex parsing
 * 2. daily_priorities table - gets manually entered agency names from tasks
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
      const agenciesSet = new Set<string>();

      // 1. Fetch ALL campaign names from campaign_data table
      // We'll use the Set to deduplicate campaign names in memory
      const campaignNamesSet = new Set<string>();
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch ALL pages until we run out of data
      while (hasMore) {
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaign_data')
          .select('campaign_order_name')
          .not('campaign_order_name', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (campaignError) {
          console.error('Error fetching campaign data:', campaignError);
          break;
        }

        if (!campaignData || campaignData.length === 0) {
          hasMore = false;
          break;
        }

        // Add unique campaign names to set
        (campaignData as Array<{ campaign_order_name: string }>).forEach(row => {
          if (row.campaign_order_name) {
            campaignNamesSet.add(row.campaign_order_name);
          }
        });

        page++;

        // Stop if we got less than a full page (reached the end)
        if (campaignData.length < pageSize) {
          hasMore = false;
        }
      }

      console.log(`[useAgenciesList] Found ${campaignNamesSet.size} unique campaign names after fetching ${page * pageSize} total records`);

      // Extract agency names from unique campaign names using regex parsing
      campaignNamesSet.forEach(campaignName => {
        const { agency } = extractAgencyInfo(campaignName);
        if (agency && agency.trim()) {
          agenciesSet.add(agency.trim());
        }
      });

      // 2. Also get agencies from daily_priorities for manually entered ones
      const { data: prioritiesData, error: prioritiesError } = await supabase
        .from('daily_priorities')
        .select('agency_name')
        .not('agency_name', 'is', null);

      if (prioritiesError) {
        console.error('Error fetching priorities data:', prioritiesError);
      } else {
        ((prioritiesData || []) as Array<{ agency_name: string | null }>).forEach(row => {
          if (row.agency_name && row.agency_name.trim()) {
            agenciesSet.add(row.agency_name.trim());
          }
        });
      }

      // Convert to sorted array
      const agencies = Array.from(agenciesSet).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );

      console.log(`[useAgenciesList] Found ${agencies.length} unique agencies from ${campaignNamesSet.size} unique campaigns + ${(prioritiesData || []).length} tasks`);

      return agencies;
    },
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer cache since campaign data changes less frequently
  });
}

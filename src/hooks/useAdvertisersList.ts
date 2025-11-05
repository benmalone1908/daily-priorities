/**
 * Custom hook to fetch and extract unique advertiser names from both campaign data and daily priorities
 * Returns both a flat list of all advertisers and a mapping by agency
 *
 * This hook queries two sources:
 * 1. campaign_data table - extracts advertisers from 67k+ campaign names using regex parsing
 * 2. daily_priorities table - gets manually entered advertiser names from tasks
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
      // Extract unique advertiser names and build agency-to-advertisers mapping
      const advertisersSet = new Set<string>();
      const agencyToAdvertisers = new Map<string, Set<string>>();

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

      console.log(`[useAdvertisersList] Found ${campaignNamesSet.size} unique campaign names after fetching ${page * pageSize} total records`);

      // Extract advertiser and agency names from unique campaign names using regex parsing
      campaignNamesSet.forEach(campaignName => {
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

      // 2. Also get advertisers from daily_priorities for manually entered ones
      const { data: prioritiesData, error: prioritiesError } = await supabase
        .from('daily_priorities')
        .select('client_name, agency_name')
        .not('client_name', 'is', null);

      if (prioritiesError) {
        console.error('Error fetching priorities data:', prioritiesError);
      } else {
        ((prioritiesData || []) as Array<{ client_name: string | null; agency_name: string | null }>).forEach(row => {
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
      }

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

      console.log(`[useAdvertisersList] Found ${advertisers.length} unique advertisers from ${campaignNamesSet.size} unique campaigns + ${(prioritiesData || []).length} tasks`);

      return { advertisers, byAgency };
    },
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer cache since campaign data changes less frequently
  });
}

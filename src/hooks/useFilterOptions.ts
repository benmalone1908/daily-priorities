
import { useMemo } from "react";
import { getAdvertiserFromCampaign } from "@/utils/chartUtils";

export const useFilterOptions = (
  data: any[],
  selectedAdvertisers: string[]
) => {
  // Generate advertiser options
  const advertiserOptions = useMemo(() => {
    const advertisers = new Set<string>();
    
    // Add debug logging
    console.log('-------- Extracting advertisers in useFilterOptions --------');
    console.log('Total data rows:', data.length);
    
    // Log all campaign names first
    const solFlowerCampaigns = data.filter(row => {
      const name = row["CAMPAIGN ORDER NAME"] || "";
      return name.includes('Sol Flower');
    });
    
    if (solFlowerCampaigns.length > 0) {
      console.log(`Found ${solFlowerCampaigns.length} Sol Flower campaigns:`);
      solFlowerCampaigns.forEach(row => {
        console.log(`- ${row["CAMPAIGN ORDER NAME"]}`);
      });
    } else {
      console.log('WARNING: No Sol Flower campaigns found in data!');
    }
    
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      // Updated regex to correctly capture advertiser names before hyphens
      const match = campaignName.match(/SM:\s+(.*?)(?=-)/);
      
      // Debug specific Sol Flower campaigns
      if (campaignName.includes('Sol Flower')) {
        console.log(`Processing: "${campaignName}"`);
        console.log(`  Match result:`, match);
        const advertiser = match ? match[1].trim() : "";
        console.log(`  Extracted advertiser: "${advertiser}"`);
      }
      
      const advertiser = match ? match[1].trim() : "";
      if (advertiser) advertisers.add(advertiser);
    });
    
    console.log('Final unique advertisers found:', advertisers.size);
    console.log('Advertiser list:', Array.from(advertisers).sort());
    
    return Array.from(advertisers)
      .sort((a, b) => a.localeCompare(b))
      .map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
  }, [data]);

  // Generate campaign options filtered by selected advertisers
  const campaignOptions = useMemo(() => {
    let filteredData = data;
    
    if (selectedAdvertisers.length > 0) {
      filteredData = data.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = getAdvertiserFromCampaign(campaignName);
        return selectedAdvertisers.includes(advertiser);
      });
    }
    
    const uniqueCampaigns = Array.from(new Set(filteredData.map(row => row["CAMPAIGN ORDER NAME"])));
    return uniqueCampaigns
      .sort((a, b) => a.localeCompare(b))
      .map(campaign => ({
        value: campaign,
        label: campaign
      }));
  }, [data, selectedAdvertisers]);

  return { advertiserOptions, campaignOptions };
};

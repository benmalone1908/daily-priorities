
import { useMemo } from 'react';
import Dashboard from './Dashboard';
import { useCampaignFilter } from '@/contexts/CampaignFilterContext';

interface DashboardWrapperProps {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
}

const DashboardWrapper = (props: DashboardWrapperProps) => {
  // Get sorted campaign options from the filtered data
  const sortedCampaignOptions = useMemo(() => {
    const campaignSet = new Set<string>();
    props.data.forEach(row => {
      if (row["CAMPAIGN ORDER NAME"]) {
        campaignSet.add(row["CAMPAIGN ORDER NAME"]);
      }
    });
    return Array.from(campaignSet).sort((a, b) => a.localeCompare(b));
  }, [props.data]);

  // Get sorted advertiser options from the filtered data
  const sortedAdvertiserOptions = useMemo(() => {
    const advertiserSet = new Set<string>();
    
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      if (advertiser) advertiserSet.add(advertiser);
    });
    
    return Array.from(advertiserSet).sort((a, b) => a.localeCompare(b));
  }, [props.data]);

  return (
    <Dashboard
      data={props.data}
      metricsData={props.metricsData}
      revenueData={props.revenueData}
      selectedMetricsCampaigns={props.selectedMetricsCampaigns}
      selectedRevenueCampaigns={props.selectedRevenueCampaigns}
      selectedRevenueAdvertisers={props.selectedRevenueAdvertisers}
      onMetricsCampaignsChange={props.onMetricsCampaignsChange}
      onRevenueCampaignsChange={props.onRevenueCampaignsChange}
      onRevenueAdvertisersChange={props.onRevenueAdvertisersChange}
      sortedCampaignOptions={sortedCampaignOptions}
      sortedAdvertiserOptions={sortedAdvertiserOptions}
    />
  );
};

export default DashboardWrapper;

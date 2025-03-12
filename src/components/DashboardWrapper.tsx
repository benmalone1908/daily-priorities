
import { useMemo } from 'react';
import Dashboard from './Dashboard';

interface DashboardWrapperProps {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  selectedMetricsAdvertisers: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
  onMetricsAdvertisersChange: (selected: string[]) => void;
}

const DashboardWrapper = (props: DashboardWrapperProps) => {
  const {
    data,
    metricsData,
    revenueData,
    selectedMetricsCampaigns,
    selectedRevenueCampaigns,
    selectedRevenueAdvertisers,
    selectedMetricsAdvertisers,
    onMetricsCampaignsChange,
    onRevenueCampaignsChange,
    onRevenueAdvertisersChange,
    onMetricsAdvertisersChange
  } = props;

  // Get sorted campaign options from the data
  const sortedCampaignOptions = useMemo(() => {
    const campaignSet = new Set<string>();
    data.forEach(row => {
      if (row["CAMPAIGN ORDER NAME"]) {
        campaignSet.add(row["CAMPAIGN ORDER NAME"]);
      }
    });
    return Array.from(campaignSet).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Get sorted advertiser options from the data
  const sortedAdvertiserOptions = useMemo(() => {
    const advertiserSet = new Set<string>();
    
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      if (advertiser) advertiserSet.add(advertiser);
    });
    
    return Array.from(advertiserSet).sort((a, b) => a.localeCompare(b));
  }, [data]);

  return (
    <Dashboard
      data={data}
      metricsData={metricsData}
      revenueData={revenueData}
      selectedMetricsCampaigns={selectedMetricsCampaigns}
      selectedRevenueCampaigns={selectedRevenueCampaigns}
      selectedRevenueAdvertisers={selectedRevenueAdvertisers}
      selectedMetricsAdvertisers={selectedMetricsAdvertisers}
      onMetricsCampaignsChange={onMetricsCampaignsChange}
      onRevenueCampaignsChange={onRevenueCampaignsChange}
      onRevenueAdvertisersChange={onRevenueAdvertisersChange}
      onMetricsAdvertisersChange={onMetricsAdvertisersChange}
      sortedCampaignOptions={sortedCampaignOptions}
      sortedAdvertiserOptions={sortedAdvertiserOptions}
    />
  );
};

export default DashboardWrapper;

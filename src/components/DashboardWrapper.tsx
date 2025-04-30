
import { useMemo } from 'react';
import Dashboard from './Dashboard';
import { useCampaignFilter } from '@/contexts/CampaignFilterContext';

interface DashboardWrapperProps {
  data: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
  sortedCampaignOptions: string[];
  sortedAdvertiserOptions: string[];
}

const DashboardWrapper = (props: DashboardWrapperProps) => {
  // Use the data that has already been filtered by campaigns and advertisers at the page level
  const filteredData = props.data;

  // Derive metrics and revenue data based on the already filtered data
  const metricsData = useMemo(() => filteredData, [filteredData]);
  const revenueData = useMemo(() => filteredData, [filteredData]);

  return (
    <Dashboard
      data={filteredData}
      metricsData={metricsData}
      revenueData={revenueData}
      selectedMetricsCampaigns={props.selectedMetricsCampaigns}
      selectedRevenueCampaigns={props.selectedRevenueCampaigns}
      selectedRevenueAdvertisers={props.selectedRevenueAdvertisers}
      onMetricsCampaignsChange={props.onMetricsCampaignsChange}
      onRevenueCampaignsChange={props.onRevenueCampaignsChange}
      onRevenueAdvertisersChange={props.onRevenueAdvertisersChange}
      sortedCampaignOptions={props.sortedCampaignOptions}
      sortedAdvertiserOptions={props.sortedAdvertiserOptions}
    />
  );
};

export default DashboardWrapper;

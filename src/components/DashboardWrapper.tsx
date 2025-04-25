
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
  const {
    data,
    metricsData,
    revenueData,
    selectedMetricsCampaigns,
    selectedRevenueCampaigns,
    selectedRevenueAdvertisers,
    onMetricsCampaignsChange,
    onRevenueCampaignsChange,
    onRevenueAdvertisersChange
  } = props;

  const { showLiveOnly } = useCampaignFilter();

  // Find the most recent date in the data
  const mostRecentDate = useMemo(() => {
    const dates = data
      .map(row => row.DATE)
      .filter(Boolean)
      .sort()
      .reverse();
    return dates[0];
  }, [data]);

  // Filter data based on live campaigns setting
  const filterLiveCampaigns = (dataToFilter: any[]) => {
    if (!showLiveOnly || !mostRecentDate) return dataToFilter;
    return dataToFilter.filter(row => row.DATE === mostRecentDate);
  };

  // Get sorted campaign options from the filtered data
  const sortedCampaignOptions = useMemo(() => {
    const filteredData = filterLiveCampaigns(data);
    const campaignSet = new Set<string>();
    filteredData.forEach(row => {
      if (row["CAMPAIGN ORDER NAME"]) {
        campaignSet.add(row["CAMPAIGN ORDER NAME"]);
      }
    });
    return Array.from(campaignSet).sort((a, b) => a.localeCompare(b));
  }, [data, showLiveOnly, mostRecentDate]);

  // Get sorted advertiser options from the filtered data
  const sortedAdvertiserOptions = useMemo(() => {
    const filteredData = filterLiveCampaigns(data);
    const advertiserSet = new Set<string>();
    
    filteredData.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      if (advertiser) advertiserSet.add(advertiser);
    });
    
    return Array.from(advertiserSet).sort((a, b) => a.localeCompare(b));
  }, [data, showLiveOnly, mostRecentDate]);

  // Apply live campaign filter to metrics and revenue data
  const filteredMetricsData = filterLiveCampaigns(metricsData);
  const filteredRevenueData = filterLiveCampaigns(revenueData);

  return (
    <Dashboard
      data={filterLiveCampaigns(data)}
      metricsData={filteredMetricsData}
      revenueData={filteredRevenueData}
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

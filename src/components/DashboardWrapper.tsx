
import { useMemo, useState } from 'react';
import Dashboard from './Dashboard';
import { useCampaignFilter } from '@/contexts/CampaignFilterContext';
import { Option } from './MultiSelect';

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
  const [viewMode, setViewMode] = useState<"date" | "dayOfWeek">("date");
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);

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

  // Convert to option format for MultiSelect
  const advertiserOptions: Option[] = useMemo(() => {
    return sortedAdvertiserOptions.map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));
  }, [sortedAdvertiserOptions]);

  const campaignOptions: Option[] = useMemo(() => {
    return sortedCampaignOptions.map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [sortedCampaignOptions]);

  // Filter campaigns based on selected advertisers
  const filteredCampaignOptions = useMemo(() => {
    if (!selectedAdvertisers.length) return campaignOptions;
    
    return campaignOptions.filter(option => {
      const campaignName = option.value;
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      return selectedAdvertisers.includes(advertiser);
    });
  }, [campaignOptions, selectedAdvertisers]);

  // Handle advertiser selection
  const handleAdvertisersChange = (selected: string[]) => {
    setSelectedAdvertisers(selected);
    
    // Clear campaign selection if the advertiser no longer matches
    if (selected.length > 0) {
      const validCampaigns = selectedCampaigns.filter(campaign => {
        const match = campaign.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selected.includes(advertiser);
      });
      
      setSelectedCampaigns(validCampaigns);
    }
  };

  // Filter data based on selected advertisers and campaigns
  const getFilteredData = () => {
    let filtered = [...props.data];
    
    if (selectedAdvertisers.length > 0) {
      filtered = filtered.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const match = campaignName.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selectedAdvertisers.includes(advertiser);
      });
    }
    
    if (selectedCampaigns.length > 0) {
      filtered = filtered.filter(row => selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }
    
    return filtered;
  };

  const filteredData = getFilteredData();

  return (
    <Dashboard
      data={filteredData}
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
      viewMode={viewMode}
      setViewMode={setViewMode}
      selectedAdvertisers={selectedAdvertisers}
      selectedCampaigns={selectedCampaigns}
      advertiserOptions={advertiserOptions}
      campaignOptions={filteredCampaignOptions}
      onAdvertisersChange={handleAdvertisersChange}
      onCampaignsChange={setSelectedCampaigns}
    />
  );
};

export default DashboardWrapper;

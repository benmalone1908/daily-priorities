
import { useMemo, useState } from 'react';
import Dashboard from './Dashboard';
import { useCampaignFilter } from '@/contexts/CampaignFilterContext';
import { Option } from './MultiSelect';

type ChartViewMode = "date" | "dayOfWeek";

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
  // Add shared filter state
  const [viewMode, setViewMode] = useState<ChartViewMode>("date");
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

  // Convert to option format for select components
  const advertiserOptions = useMemo(() => {
    return sortedAdvertiserOptions.map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));
  }, [sortedAdvertiserOptions]);

  const campaignOptions = useMemo(() => {
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
  
  const handleAdvertisersChange = (selected: string[]) => {
    setSelectedAdvertisers(selected);
    
    // If we select advertisers, filter campaigns to only include those from selected advertisers
    if (selected.length > 0) {
      const validCampaigns = selectedCampaigns.filter(campaign => {
        const match = campaign.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selected.includes(advertiser);
      });
      
      setSelectedCampaigns(validCampaigns);
    }
  };
  
  const handleCampaignsChange = (selected: string[]) => {
    setSelectedCampaigns(selected);
  };

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
      // Add new shared filter props
      viewMode={viewMode}
      setViewMode={setViewMode}
      selectedAdvertisers={selectedAdvertisers}
      selectedCampaigns={selectedCampaigns}
      advertiserOptions={advertiserOptions}
      campaignOptions={filteredCampaignOptions}
      onAdvertisersChange={handleAdvertisersChange}
      onCampaignsChange={handleCampaignsChange}
    />
  );
};

export default DashboardWrapper;

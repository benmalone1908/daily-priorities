
import { useMemo } from 'react';
import Dashboard from './Dashboard';
import { useCampaignFilter } from '@/contexts/CampaignFilterContext';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

interface DashboardWrapperProps {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  selectedRevenueAgencies: string[];
  selectedMetricsAgencies: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
  onRevenueAgenciesChange: (selected: string[]) => void;
  onMetricsAgenciesChange: (selected: string[]) => void;
}

const DashboardWrapper = (props: DashboardWrapperProps) => {
  const { extractAdvertiserName, extractAgencyName, isTestCampaign } = useCampaignFilter();
  
  // Get sorted campaign options from the filtered data, excluding test/demo/draft campaigns
  const sortedCampaignOptions = useMemo(() => {
    const campaignSet = new Set<string>();
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (campaignName && !isTestCampaign(campaignName)) {
        campaignSet.add(campaignName);
      }
    });
    return Array.from(campaignSet).sort((a, b) => a.localeCompare(b));
  }, [props.data, isTestCampaign]);

  // Get sorted agency options from the filtered data
  const sortedAgencyOptions = useMemo(() => {
    const agencySet = new Set<string>();
    
    console.log('-------- Extracting agencies in DashboardWrapper --------');
    console.log('Total data rows:', props.data.length);
    
    // Debug: Log the first few campaign names
    const sampleCampaigns = props.data.slice(0, 5).map(row => row["CAMPAIGN ORDER NAME"]);
    console.log('Sample campaigns:', sampleCampaigns);
    
    // Process all campaign names to extract agencies
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
      // Skip test campaigns
      if (isTestCampaign(campaignName)) {
        return;
      }
      
      // Use shared function to extract agency names
      const agency = extractAgencyName(campaignName);
      
      if (agency) {
        agencySet.add(agency);
      }
    });
    
    console.log('Total unique agencies found:', agencySet.size);
    console.log('Agency list:', Array.from(agencySet).sort());
    
    return Array.from(agencySet).sort((a, b) => a.localeCompare(b));
  }, [props.data, extractAgencyName, isTestCampaign]);

  // Get sorted advertiser options from the filtered data
  const sortedAdvertiserOptions = useMemo(() => {
    const advertiserSet = new Set<string>();
    
    console.log('-------- Extracting advertisers in DashboardWrapper --------');
    
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
      // Skip test campaigns
      if (isTestCampaign(campaignName)) {
        return;
      }
      
      // Use shared function to extract advertiser names
      const advertiser = extractAdvertiserName(campaignName);
      
      if (advertiser) {
        advertiserSet.add(advertiser);
      }
    });
    
    console.log('Total unique advertisers found:', advertiserSet.size);
    console.log('Advertiser list:', Array.from(advertiserSet).sort());
    
    return Array.from(advertiserSet).sort((a, b) => a.localeCompare(b));
  }, [props.data, extractAdvertiserName, isTestCampaign]);

  // Prepare aggregated data for the top spark charts
  const aggregatedMetricsData = useMemo(() => {
    if (!props.data || props.data.length === 0) return [];
    
    const dateGroups: Record<string, any> = {};
    
    props.data.forEach(row => {
      if (!row || !row.DATE || row.DATE === 'Totals') return;
      
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return; // Skip test campaigns
      
      const dateStr = String(row.DATE).trim();
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0
        };
      }
      
      dateGroups[dateStr].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      dateGroups[dateStr].CLICKS += Number(row.CLICKS) || 0;
      dateGroups[dateStr].REVENUE += Number(row.REVENUE) || 0;
      dateGroups[dateStr].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
    });
    
    return Object.values(dateGroups).sort((a: any, b: any) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (err) {
        return 0;
      }
    });
  }, [props.data, isTestCampaign]);

  return (
    <Dashboard
      data={props.data}
      metricsData={props.metricsData}
      revenueData={props.revenueData}
      selectedMetricsCampaigns={props.selectedMetricsCampaigns}
      selectedMetricsAgencies={props.selectedMetricsAgencies}
      selectedRevenueCampaigns={props.selectedRevenueCampaigns}
      selectedRevenueAdvertisers={props.selectedRevenueAdvertisers}
      selectedRevenueAgencies={props.selectedRevenueAgencies}
      onMetricsCampaignsChange={props.onMetricsCampaignsChange}
      onMetricsAgenciesChange={props.onMetricsAgenciesChange}
      onRevenueCampaignsChange={props.onRevenueCampaignsChange}
      onRevenueAdvertisersChange={props.onRevenueAdvertisersChange}
      onRevenueAgenciesChange={props.onRevenueAgenciesChange}
      sortedCampaignOptions={sortedCampaignOptions}
      sortedAdvertiserOptions={sortedAdvertiserOptions}
      sortedAgencyOptions={sortedAgencyOptions}
      aggregatedMetricsData={aggregatedMetricsData}
    />
  );
};

export default DashboardWrapper;

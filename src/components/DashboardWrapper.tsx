
import { useMemo } from 'react';
import Dashboard from './Dashboard';
import { useCampaignFilter } from '@/contexts/CampaignFilterContext';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { Option } from './MultiSelect';

interface DashboardWrapperProps {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  selectedRevenueAgencies: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
  onRevenueAgenciesChange: (selected: string[]) => void;
}

const DashboardWrapper = (props: DashboardWrapperProps) => {
  const { extractAdvertiserName, isTestCampaign, extractAgencyInfo } = useCampaignFilter();
  
  // Get sorted campaign options from the filtered data, excluding test/demo/draft campaigns
  const sortedCampaignOptions = useMemo(() => {
    const campaignSet = new Set<string>();
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (campaignName && !isTestCampaign(campaignName)) {
        campaignSet.add(campaignName);
      }
    });
    
    // Create campaign option objects for the MultiSelect component
    return Array.from(campaignSet).sort((a, b) => a.localeCompare(b)).map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [props.data, isTestCampaign]);

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
      
      // Additional explicit logging for Sol Flower
      if (campaignName.includes('Sol Flower')) {
        console.log(`Sol Flower campaign found: "${campaignName}" -> Extracted: "${advertiser}"`);
      }
      
      if (advertiser) {
        advertiserSet.add(advertiser);
        // Log when adding Sol Flower to the set
        if (advertiser === "Sol Flower") {
          console.log(`Added "Sol Flower" to advertiser set, current size: ${advertiserSet.size}`);
        }
      }
    });
    
    console.log('Total unique advertisers found:', advertiserSet.size);
    console.log('Advertiser list:', Array.from(advertiserSet).sort());
    
    // Check if Sol Flower exists in the final set
    const hasSolFlower = advertiserSet.has("Sol Flower");
    console.log(`Final set includes "Sol Flower": ${hasSolFlower}`);
    
    // Create advertiser option objects for the MultiSelect component
    return Array.from(advertiserSet).sort((a, b) => a.localeCompare(b)).map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));
  }, [props.data, extractAdvertiserName, isTestCampaign]);

  // Get sorted agency options from the filtered data
  const sortedAgencyOptions = useMemo(() => {
    const agencySet = new Set<string>();
    
    console.log('-------- Extracting agencies in DashboardWrapper --------');
    
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
      // Skip test campaigns
      if (isTestCampaign(campaignName)) {
        return;
      }
      
      // Use shared function to extract agency names
      const { agency } = extractAgencyInfo(campaignName);
      
      if (agency) {
        agencySet.add(agency);
        console.log(`Added agency: "${agency}" from campaign: "${campaignName}"`);
      }
    });
    
    console.log('Total unique agencies found:', agencySet.size);
    console.log('Agency list:', Array.from(agencySet).sort());
    
    // Create agency option objects for the MultiSelect component
    return Array.from(agencySet).sort((a, b) => a.localeCompare(b)).map(agency => ({
      value: agency,
      label: agency
    }));
  }, [props.data, extractAgencyInfo, isTestCampaign]);

  // Create a mapping from agency to advertisers
  const agencyToAdvertisersMap = useMemo(() => {
    const mapping: Record<string, Set<string>> = {};
    
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
      if (isTestCampaign(campaignName)) {
        return;
      }
      
      const { agency } = extractAgencyInfo(campaignName);
      const advertiser = extractAdvertiserName(campaignName);
      
      if (agency && advertiser) {
        if (!mapping[agency]) {
          mapping[agency] = new Set<string>();
        }
        mapping[agency].add(advertiser);
      }
    });
    
    // Add debugging
    console.log('Agency to Advertisers mapping:');
    Object.entries(mapping).forEach(([agency, advertisers]) => {
      console.log(`Agency: ${agency} -> Advertisers: ${Array.from(advertisers).join(', ')}`);
    });
    
    return mapping;
  }, [props.data, extractAgencyInfo, extractAdvertiserName, isTestCampaign]);
  
  // Create a mapping of agencies to campaigns
  const agencyToCampaignsMap = useMemo(() => {
    const mapping: Record<string, Set<string>> = {};
    
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
      if (isTestCampaign(campaignName)) {
        return;
      }
      
      const { agency } = extractAgencyInfo(campaignName);
      
      if (agency && campaignName) {
        if (!mapping[agency]) {
          mapping[agency] = new Set<string>();
        }
        mapping[agency].add(campaignName);
      }
    });
    
    console.log('Agency to Campaigns mapping:');
    Object.entries(mapping).forEach(([agency, campaigns]) => {
      console.log(`Agency: ${agency} -> # Campaigns: ${campaigns.size}`);
    });
    
    return mapping;
  }, [props.data, extractAgencyInfo, isTestCampaign]);
  
  // Create a mapping of advertisers to campaigns
  const advertiserToCampaignsMap = useMemo(() => {
    const mapping: Record<string, Set<string>> = {};
    
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
      if (isTestCampaign(campaignName)) {
        return;
      }
      
      const advertiser = extractAdvertiserName(campaignName);
      
      if (advertiser && campaignName) {
        if (!mapping[advertiser]) {
          mapping[advertiser] = new Set<string>();
        }
        mapping[advertiser].add(campaignName);
      }
    });
    
    return mapping;
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

  // Now we properly prepare both formats needed by the different components:
  // 1. The raw string arrays needed by the Dashboard methods
  const campaignOptionsForDashboard = sortedCampaignOptions.map(option => option.value);
  const advertiserOptionsForDashboard = sortedAdvertiserOptions.map(option => option.value);
  const agencyOptionsForDashboard = sortedAgencyOptions.map(option => option.value);

  // Pass all the sorted options to the Dashboard component
  return (
    <Dashboard
      data={props.data}
      metricsData={props.metricsData}
      revenueData={props.revenueData}
      selectedMetricsCampaigns={props.selectedMetricsCampaigns}
      selectedRevenueCampaigns={props.selectedRevenueCampaigns}
      selectedRevenueAdvertisers={props.selectedRevenueAdvertisers}
      selectedRevenueAgencies={props.selectedRevenueAgencies}
      onMetricsCampaignsChange={props.onMetricsCampaignsChange}
      onRevenueCampaignsChange={props.onRevenueCampaignsChange}
      onRevenueAdvertisersChange={props.onRevenueAdvertisersChange}
      onRevenueAgenciesChange={props.onRevenueAgenciesChange}
      sortedCampaignOptions={campaignOptionsForDashboard}
      sortedAdvertiserOptions={advertiserOptionsForDashboard}
      sortedAgencyOptions={agencyOptionsForDashboard}
      aggregatedMetricsData={aggregatedMetricsData}
      agencyToAdvertisersMap={agencyToAdvertisersMap}
      agencyToCampaignsMap={agencyToCampaignsMap}
      advertiserToCampaignsMap={advertiserToCampaignsMap}
    />
  );
};

export default DashboardWrapper;

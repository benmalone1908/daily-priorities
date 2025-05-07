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
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
}

const DashboardWrapper = (props: DashboardWrapperProps) => {
  const { extractAdvertiserName } = useCampaignFilter();
  
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
    
    console.log('-------- Extracting advertisers in DashboardWrapper --------');
    
    props.data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
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
    
    return Array.from(advertiserSet).sort((a, b) => a.localeCompare(b));
  }, [props.data, extractAdvertiserName]);

  // Prepare aggregated data for the top spark charts
  const aggregatedMetricsData = useMemo(() => {
    if (!props.data || props.data.length === 0) return [];
    
    const dateGroups: Record<string, any> = {};
    
    props.data.forEach(row => {
      if (!row || !row.DATE || row.DATE === 'Totals') return;
      
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
      aggregatedMetricsData={aggregatedMetricsData}
    />
  );
};

export default DashboardWrapper;

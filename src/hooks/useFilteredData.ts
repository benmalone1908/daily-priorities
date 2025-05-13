
import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

/**
 * Hook for handling all data filtering logic
 */
export const useFilteredData = (data: any[], dateRange: DateRange | undefined) => {
  const [selectedMetricsCampaigns, setSelectedMetricsCampaigns] = useState<string[]>([]);
  const [selectedRevenueCampaigns, setSelectedRevenueCampaigns] = useState<string[]>([]);
  const [selectedRevenueAdvertisers, setSelectedRevenueAdvertisers] = useState<string[]>([]);
  
  const { showLiveOnly } = useCampaignFilter();

  // Find most recent date in the dataset
  const getMostRecentDate = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const dates = data
      .map(row => row.DATE)
      .filter(date => date && date !== 'Totals')
      .sort((a, b) => {
        try {
          // Convert to Date objects for comparison
          const dateA = new Date(a);
          const dateB = new Date(b);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          return dateB.getTime() - dateA.getTime();
        } catch (e) {
          console.error("Error sorting dates:", e);
          return 0;
        }
      });
    
    return dates.length > 0 ? dates[0] : null;
  }, [data]);

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return data;
    }

    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();
    toDate.setHours(23, 59, 59, 999);
    
    return data.filter(row => {
      try {
        if (!row.DATE || row.DATE === 'Totals') return true;
        
        const dateStr = String(row.DATE).trim();
        const rowDate = new Date(dateStr);
        if (isNaN(rowDate.getTime())) {
          console.warn(`Could not parse date in row: ${dateStr}`);
          return false;
        }
        
        return rowDate >= fromDate && rowDate <= toDate;
      } catch (error) {
        console.error(`Error filtering by date for row:`, error);
        return false;
      }
    });
  }, [data, dateRange]);
  
  // Filter data by live status (show only active campaigns)
  const filteredDataByLiveStatus = useMemo(() => {
    if (!showLiveOnly) return filteredData;

    const mostRecentDate = getMostRecentDate;
    if (!mostRecentDate) return filteredData;
    
    // First get all the campaigns that have impressions on the most recent date
    const activeCampaignsOnMostRecentDate = new Set<string>();
    
    filteredData.forEach(row => {
      if (row.DATE === mostRecentDate && Number(row.IMPRESSIONS) > 0) {
        activeCampaignsOnMostRecentDate.add(row["CAMPAIGN ORDER NAME"]);
      }
    });
    
    // Now filter to include all dates, but only for campaigns active on most recent date
    return filteredData.filter(row => {
      if (row.DATE === 'Totals') return true;
      return activeCampaignsOnMostRecentDate.has(row["CAMPAIGN ORDER NAME"]);
    });
  }, [filteredData, showLiveOnly, getMostRecentDate]);

  // Filter by selected campaigns
  const getFilteredDataBySelectedCampaigns = (campaigns: string[]) => {
    if (!campaigns.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => campaigns.includes(row["CAMPAIGN ORDER NAME"]));
  };

  // Filter by selected advertisers
  const getFilteredDataByAdvertisers = (advertisers: string[]) => {
    if (!advertisers.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      return advertisers.includes(advertiser);
    });
  };

  // Filter by both campaigns and advertisers
  const getFilteredDataByCampaignsAndAdvertisers = (campaigns: string[], advertisers: string[]) => {
    let filtered = filteredDataByLiveStatus;
    
    if (advertisers.length > 0) {
      filtered = getFilteredDataByAdvertisers(advertisers);
    }
    
    if (campaigns.length > 0) {
      return filtered.filter(row => campaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }
    
    return filtered;
  };

  return {
    filteredData,
    filteredDataByLiveStatus,
    selectedMetricsCampaigns,
    selectedRevenueCampaigns,
    selectedRevenueAdvertisers,
    setSelectedMetricsCampaigns,
    setSelectedRevenueCampaigns,
    setSelectedRevenueAdvertisers,
    getFilteredDataBySelectedCampaigns,
    getFilteredDataByAdvertisers,
    getFilteredDataByCampaignsAndAdvertisers
  };
};

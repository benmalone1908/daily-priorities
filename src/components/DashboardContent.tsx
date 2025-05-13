
import { useState, Suspense, lazy } from "react";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

// Lazy load heavy components
const DashboardWrapper = lazy(() => import("@/components/DashboardWrapper"));
const CampaignSparkCharts = lazy(() => import("@/components/CampaignSparkCharts"));
const AggregatedSparkCharts = lazy(() => 
  import("@/pages/components/AggregatedSparkCharts").then(module => ({ default: module.default }))
);

// Loading fallback component
const LoadingFallback = () => (
  <div className="w-full py-12 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

interface DashboardContentProps {
  data: any[];
  dateRange: DateRange | undefined;
  activeTab: string;
}

const DashboardContent = ({
  data,
  dateRange,
  activeTab
}: DashboardContentProps) => {
  const [selectedMetricsCampaigns, setSelectedMetricsCampaigns] = useState<string[]>([]);
  const [selectedRevenueCampaigns, setSelectedRevenueCampaigns] = useState<string[]>([]);
  const [selectedRevenueAdvertisers, setSelectedRevenueAdvertisers] = useState<string[]>([]);
  
  const { showLiveOnly } = useCampaignFilter();

  const getMostRecentDate = () => {
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
  };

  const getFilteredData = () => {
    let filtered = data;
    
    if (!dateRange || !dateRange.from) {
      return filtered;
    }

    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();
    toDate.setHours(23, 59, 59, 999);
    
    filtered = data.filter(row => {
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

    return filtered;
  };

  const filteredData = getFilteredData();
  
  const filteredDataByLiveStatus = (() => {
    if (!showLiveOnly) return filteredData;

    const mostRecentDate = getMostRecentDate();
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
  })();

  const getFilteredDataBySelectedCampaigns = (campaigns: string[]) => {
    if (!campaigns.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => campaigns.includes(row["CAMPAIGN ORDER NAME"]));
  };

  const getFilteredDataByAdvertisers = (advertisers: string[]) => {
    if (!advertisers.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      return advertisers.includes(advertiser);
    });
  };

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

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsContent value="dashboard">
        <Suspense fallback={<LoadingFallback />}>
          <DashboardWrapper 
            data={showLiveOnly ? filteredDataByLiveStatus : filteredData} 
            metricsData={getFilteredDataBySelectedCampaigns(selectedMetricsCampaigns)}
            revenueData={getFilteredDataByCampaignsAndAdvertisers(selectedRevenueCampaigns, selectedRevenueAdvertisers)}
            selectedMetricsCampaigns={selectedMetricsCampaigns}
            selectedRevenueCampaigns={selectedRevenueCampaigns}
            selectedRevenueAdvertisers={selectedRevenueAdvertisers}
            onMetricsCampaignsChange={setSelectedMetricsCampaigns}
            onRevenueCampaignsChange={setSelectedRevenueCampaigns}
            onRevenueAdvertisersChange={setSelectedRevenueAdvertisers}
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="sparks">
        <Suspense fallback={<LoadingFallback />}>
          <AggregatedSparkCharts 
            data={filteredDataByLiveStatus.filter(row => row.DATE !== 'Totals')}
          />
          <CampaignSparkCharts data={showLiveOnly ? filteredDataByLiveStatus : filteredData} dateRange={dateRange} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default DashboardContent;

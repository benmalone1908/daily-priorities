
import { Suspense, lazy } from "react";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useFilteredData } from "@/hooks/useFilteredData";

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
  const {
    filteredDataByLiveStatus,
    selectedMetricsCampaigns,
    selectedRevenueCampaigns,
    selectedRevenueAdvertisers,
    setSelectedMetricsCampaigns,
    setSelectedRevenueCampaigns,
    setSelectedRevenueAdvertisers,
    getFilteredDataBySelectedCampaigns,
    getFilteredDataByCampaignsAndAdvertisers
  } = useFilteredData(data, dateRange);

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsContent value="dashboard">
        <Suspense fallback={<LoadingFallback />}>
          <DashboardWrapper 
            data={filteredDataByLiveStatus} 
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
          <CampaignSparkCharts data={filteredDataByLiveStatus} dateRange={dateRange} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default DashboardContent;

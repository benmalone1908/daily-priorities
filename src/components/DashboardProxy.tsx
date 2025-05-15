
import { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import CombinedMetricsChart from "./CombinedMetricsChart";
import { ChartToggle } from "./ChartToggle";

// Define props interface to match Dashboard component
interface DashboardProxyProps {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  selectedRevenueAgencies: string[];
  selectedMetricsAdvertisers: string[];
  selectedMetricsAgencies: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
  onRevenueAgenciesChange: (selected: string[]) => void;
  onMetricsAdvertisersChange: (selected: string[]) => void;
  onMetricsAgenciesChange: (selected: string[]) => void;
  sortedCampaignOptions: string[];
  sortedAdvertiserOptions: string[];
  sortedAgencyOptions: string[];
  formattedCampaignOptions: any[];
  formattedAdvertiserOptions: any[];
  formattedAgencyOptions: any[];
  aggregatedMetricsData: any[];
  agencyToAdvertisersMap: Record<string, Set<string>>;
  agencyToCampaignsMap: Record<string, Set<string>>;
  advertiserToCampaignsMap: Record<string, Set<string>>;
  selectedWeeklyCampaigns: string[];
  onWeeklyCampaignsChange: (selected: string[]) => void;
  // Add useGlobalFilters prop to match what's being passed in DashboardWrapper
  useGlobalFilters?: boolean;
  // Add prop to hide specific charts - we're passing this through to Dashboard
  hideCharts?: string[];
  // Add prop for chart toggle component that we want to pass to Dashboard
  chartToggleComponent?: React.ReactNode;
}

// Wrapper component for passing props to Dashboard
const DashboardProxy = (props: DashboardProxyProps) => {
  const [isAttributionChart, setIsAttributionChart] = useState(false);
  const [activeTab, setActiveTab] = useState("display");

  // Sync the toggle with the active tab
  useEffect(() => {
    setIsAttributionChart(activeTab === "attribution");
  }, [activeTab]);

  // Handle toggle changes
  const handleToggleChange = (value: boolean) => {
    setIsAttributionChart(value);
    setActiveTab(value ? "attribution" : "display");
  };

  // Create our own chart toggle component with the proper state
  const chartToggle = (
    <ChartToggle 
      isAttributionChart={isAttributionChart} 
      setIsAttributionChart={handleToggleChange} 
    />
  );
  
  return (
    <div className="relative">
      <Dashboard
        data={props.data}
        metricsData={props.metricsData}
        revenueData={props.revenueData}
        selectedMetricsCampaigns={props.selectedMetricsCampaigns}
        selectedRevenueCampaigns={props.selectedRevenueCampaigns}
        selectedRevenueAdvertisers={props.selectedRevenueAdvertisers}
        selectedRevenueAgencies={props.selectedRevenueAgencies}
        selectedMetricsAdvertisers={props.selectedMetricsAdvertisers}
        selectedMetricsAgencies={props.selectedMetricsAgencies}
        onMetricsCampaignsChange={(selected) => {
          console.log("DashboardProxy: Metrics campaigns changed:", selected);
          props.onMetricsCampaignsChange(selected);
        }}
        onRevenueCampaignsChange={props.onRevenueCampaignsChange}
        onRevenueAdvertisersChange={props.onRevenueAdvertisersChange}
        onRevenueAgenciesChange={props.onRevenueAgenciesChange}
        onMetricsAdvertisersChange={(selected) => {
          console.log("DashboardProxy: Metrics advertisers changed:", selected);
          props.onMetricsAdvertisersChange(selected);
        }}
        onMetricsAgenciesChange={(selected) => {
          console.log("DashboardProxy: Metrics agencies changed:", selected);
          props.onMetricsAgenciesChange(selected);
        }}
        sortedCampaignOptions={props.sortedCampaignOptions}
        sortedAdvertiserOptions={props.sortedAdvertiserOptions}
        sortedAgencyOptions={props.sortedAgencyOptions}
        formattedCampaignOptions={props.formattedCampaignOptions}
        formattedAdvertiserOptions={props.formattedAdvertiserOptions}
        formattedAgencyOptions={props.formattedAgencyOptions}
        aggregatedMetricsData={props.aggregatedMetricsData}
        agencyToAdvertisersMap={props.agencyToAdvertisersMap}
        agencyToCampaignsMap={props.agencyToCampaignsMap}
        advertiserToCampaignsMap={props.advertiserToCampaignsMap}
        selectedWeeklyCampaigns={props.selectedWeeklyCampaigns}
        onWeeklyCampaignsChange={props.onWeeklyCampaignsChange}
        useGlobalFilters={props.useGlobalFilters}
        hideCharts={props.hideCharts}
        // Pass our chart toggle and current tab to Dashboard
        chartToggleComponent={chartToggle}
        activeTab={activeTab} // Changed from activeChartTab to activeTab to match the Dashboard.tsx interface
        onChartTabChange={setActiveTab}
      />
    </div>
  );
};

export default DashboardProxy;

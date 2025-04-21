import { formatDateToDisplay } from "@/lib/utils";

// Define a function for formatting dates in the chart
const formatDate = (value: string) => {
  // Convert to properly formatted date string
  return formatDateToDisplay(value);
};

const customTickFormatter = (value: string) => {
  const allDates = [
    '3/24/2025', '3/25/2025', '3/26/2025', '3/27/2025', '3/28/2025', '3/29/2025', '3/30/2025', 
    '3/31/2025', '4/1/2025', '4/2/2025', '4/3/2025', '4/4/2025', '4/5/2025', '4/6/2025', 
    '4/7/2025', '4/8/2025', '4/9/2025', '4/10/2025', '4/11/2025', '4/12/2025', '4/13/2025', 
    '4/14/2025', '4/15/2025', '4/16/2025', '4/17/2025', '4/18/2025', '4/19/2025', '4/20/2025'
  ];
  
  const intervalDates = [
    '3/24/2025', '3/30/2025', '4/7/2025', '4/14/2025', '4/20/2025'
  ];
  
  // If it's an exact match to one of our interval dates, always show
  if (intervalDates.includes(value)) {
    return formatDate(value);
  }
  
  // For the full range, show every 3rd date
  const index = allDates.indexOf(value);
  return index % 3 === 0 ? formatDate(value) : '';
};

interface DashboardProps {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
  sortedCampaignOptions: string[];
  sortedAdvertiserOptions: string[];
}

const Dashboard = (props: DashboardProps) => {
  const {
    data,
    metricsData,
    revenueData,
    selectedMetricsCampaigns,
    selectedRevenueCampaigns,
    selectedRevenueAdvertisers,
    onMetricsCampaignsChange,
    onRevenueCampaignsChange,
    onRevenueAdvertisersChange,
    sortedCampaignOptions,
    sortedAdvertiserOptions
  } = props;

  const filteredMetricsData = metricsData.filter(row => selectedMetricsCampaigns.includes(row["CAMPAIGN ORDER NAME"]));
  const filteredRevenueData = revenueData.filter(row => 
    selectedRevenueCampaigns.includes(row["CAMPAIGN ORDER NAME"]) ||
    (row["CAMPAIGN ORDER NAME"] && selectedRevenueAdvertisers.some(advertiser => row["CAMPAIGN ORDER NAME"].includes(advertiser)))
  );

  // Calculate total impressions, clicks, and revenue
  const totalImpressions = filteredMetricsData.reduce((sum, row) => sum + row.IMPRESSIONS, 0);
  const totalClicks = filteredMetricsData.reduce((sum, row) => sum + row.CLICKS, 0);
  const totalRevenue = filteredRevenueData.reduce((sum, row) => sum + row.REVENUE, 0);

  // Prepare data for the charts
  const chartData = data.map(row => ({
    date: row.DATE,
    impressions: row.IMPRESSIONS,
    clicks: row.CLICKS,
    revenue: row.REVENUE
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-white shadow-md rounded-md p-4">
        <h3 className="text-lg font-semibold mb-2">Total Impressions</h3>
        <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
      </div>
      <div className="bg-white shadow-md rounded-md p-4">
        <h3 className="text-lg font-semibold mb-2">Total Clicks</h3>
        <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
      </div>
      <div className="bg-white shadow-md rounded-md p-4">
        <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
        <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <h3 className="text-lg font-semibold mb-2">Impressions Over Time</h3>
        {/* Example chart using Recharts */}
        {/* Replace with your actual chart implementation */}
        <p>Chart goes here...</p>
      </div>
    </div>
  );
};

export default Dashboard;

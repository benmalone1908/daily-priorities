import { formatDateToDisplay } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Bar
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import WeeklySummary from "./WeeklySummary";

const formatDate = (value: string) => {
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
  
  if (intervalDates.includes(value)) {
    return formatDate(value);
  }
  
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
    metricsData,
    revenueData,
  } = props;

  const totalImpressions = metricsData.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0);
  const totalClicks = metricsData.reduce((sum, row) => sum + (Number(row.CLICKS) || 0), 0);
  const totalRevenue = revenueData.reduce((sum, row) => sum + (Number(row.REVENUE) || 0), 0);

  const chartDataByDate = new Map();
  
  metricsData.forEach(row => {
    const date = row.DATE;
    if (!chartDataByDate.has(date)) {
      chartDataByDate.set(date, {
        date,
        impressions: 0,
        clicks: 0,
        transactions: 0,
        revenue: 0
      });
    }
    
    const entry = chartDataByDate.get(date);
    entry.impressions += Number(row.IMPRESSIONS) || 0;
    entry.clicks += Number(row.CLICKS) || 0;
    entry.transactions += Number(row.TRANSACTIONS) || 0;
  });
  
  revenueData.forEach(row => {
    const date = row.DATE;
    if (!chartDataByDate.has(date)) {
      chartDataByDate.set(date, {
        date,
        impressions: 0,
        clicks: 0,
        transactions: 0,
        revenue: 0
      });
    }
    
    const entry = chartDataByDate.get(date);
    entry.revenue += Number(row.REVENUE) || 0;
    entry.transactions += Number(row.TRANSACTIONS) || 0;
  });
  
  const chartData = Array.from(chartDataByDate.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const chartConfig = {
    impressions: {
      label: "Impressions",
      color: "#0ea5e9"
    },
    clicks: {
      label: "Clicks",
      color: "#8b5cf6"
    },
    transactions: {
      label: "Transactions",
      color: "#f97316"
    },
    revenue: {
      label: "Revenue",
      color: "#10b981"
    }
  };

  const last7DaysData = (() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const filteredData = metricsData.filter(row => {
      const rowDate = new Date(row.DATE);
      return rowDate >= sevenDaysAgo && rowDate <= today;
    });

    return {
      impressions: filteredData.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0),
      clicks: filteredData.reduce((sum, row) => sum + (Number(row.CLICKS) || 0), 0),
      transactions: filteredData.reduce((sum, row) => sum + (Number(row.TRANSACTIONS) || 0), 0),
    };
  })();

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

      <div className="md:col-span-2 lg:col-span-3 bg-white shadow-md rounded-md p-4">
        <h3 className="text-lg font-semibold mb-4">Impressions and Clicks</h3>
        <div className="h-[400px]">
          <ChartContainer
            config={chartConfig}
            className="h-full w-full"
          >
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={customTickFormatter}
                minTickGap={15}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="impressions"
                name="Impressions"
                fill={chartConfig.impressions.color}
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="clicks" 
                name="Clicks"
                stroke={chartConfig.clicks.color}
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      </div>
      
      <div className="md:col-span-2 lg:col-span-3 bg-white shadow-md rounded-md p-4">
        <h3 className="text-lg font-semibold mb-4">Impressions and Transactions</h3>
        <div className="h-[400px]">
          <ChartContainer
            config={chartConfig}
            className="h-full w-full"
          >
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={customTickFormatter}
                minTickGap={15}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="impressions"
                name="Impressions"
                fill={chartConfig.impressions.color}
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="transactions" 
                name="Transactions"
                stroke={chartConfig.transactions.color}
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      </div>

      <div className="md:col-span-2 lg:col-span-3 bg-white shadow-md rounded-md p-4">
        <h3 className="text-lg font-semibold mb-4">7-Day Summary</h3>
        <WeeklySummary data={last7DaysData} />
      </div>
    </div>
  );
};

export default Dashboard;

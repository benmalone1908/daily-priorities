import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { formatNumber } from "@/lib/utils";
import SparkChartModal from "./SparkChartModal";

interface CombinedMetricsChartProps {
  data: any[];
  title?: string;
  chartToggleComponent?: React.ReactNode;
  onTabChange?: (tab: string) => void;
  initialTab?: string;
}

const CombinedMetricsChart = ({ 
  data, 
  title = "Campaign Performance", 
  chartToggleComponent,
  onTabChange,
  initialTab = "display" 
}: CombinedMetricsChartProps) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  
  console.log(`CombinedMetricsChart: Rendering with data length: ${data?.length}, activeTab: ${activeTab}, initialTab: ${initialTab}`);
  
  // Format functions for different metrics
  const formatImpressions = (value: number) => formatNumber(value);
  const formatClicks = (value: number) => formatNumber(value);
  const formatTransactions = (value: number) => formatNumber(value);
  const formatRevenue = (value: number) => `$${formatNumber(value)}`;

  // Effect to sync with initialTab prop changes
  useEffect(() => {
    if (initialTab !== activeTab) {
      console.log(`CombinedMetricsChart: Syncing tab from props: ${initialTab}`);
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    console.log(`CombinedMetricsChart: Tab changed to ${value}`);
    
    // Notify parent component about tab change
    if (onTabChange) {
      onTabChange(value);
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Process data to ensure we have all required fields
  const processedData = data
    .filter(item => item && (item.DATE || item.DAY_OF_WEEK)) // Allow both DATE and DAY_OF_WEEK as valid keys
    .map(item => ({
      date: item.DATE || item.DAY_OF_WEEK, // Use DAY_OF_WEEK if DATE is not available
      IMPRESSIONS: Number(item.IMPRESSIONS || 0),
      CLICKS: Number(item.CLICKS || 0),
      TRANSACTIONS: Number(item.TRANSACTIONS || 0),
      REVENUE: Number(item.REVENUE || 0),
    }));

  // Check if we're dealing with day of week data
  const isDayOfWeekData = processedData.some(item => item.date && /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.test(item.date));
  
  // Only sort if we're dealing with dates, not days of week
  const sortedData = !isDayOfWeekData && processedData.some(item => item.date && !isNaN(new Date(item.date).getTime()))
    ? processedData.sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch (e) {
          return 0;
        }
      })
    : processedData; // For day of week, maintain original order

  console.log(`CombinedMetricsChart: Processed data length: ${sortedData.length}, isDayOfWeekData: ${isDayOfWeekData}`);

  // Calculate bar size based on data type - make bars wider for better visibility
  const barSize = isDayOfWeekData ? 120 : 80; // Increased from 60 to 80 for regular data

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center space-x-2">
            {chartToggleComponent && (
              <div>{chartToggleComponent}</div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          {activeTab === "display" ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sortedData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={formatImpressions}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatClicks}
                  tick={{ fontSize: 10 }}
                />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "IMPRESSIONS") return [formatImpressions(value as number), "Impressions"];
                    if (name === "CLICKS") return [formatClicks(value as number), "Clicks"];
                    return [value, name];
                  }}
                  contentStyle={{ 
                    backgroundColor: "rgba(255, 255, 255, 0.95)", 
                    border: "1px solid #eee",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Legend />
                <Bar
                  dataKey="IMPRESSIONS"
                  fill="#4ade80"
                  yAxisId="left"
                  name="Impressions"
                  barSize={barSize}
                  opacity={0.8}
                />
                <Line
                  type="monotone"
                  dataKey="CLICKS"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  yAxisId="right"
                  name="Clicks"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sortedData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={formatTransactions}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatRevenue}
                  tick={{ fontSize: 10 }}
                />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "TRANSACTIONS") return [formatTransactions(value as number), "Transactions"];
                    if (name === "REVENUE") return [formatRevenue(value as number), "Revenue"];
                    return [value, name];
                  }}
                  contentStyle={{ 
                    backgroundColor: "rgba(255, 255, 255, 0.95)", 
                    border: "1px solid #eee",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="TRANSACTIONS"
                  stroke="#ef4444"
                  strokeWidth={2}
                  yAxisId="left"
                  name="Transactions"
                  dot={false}
                />
                <Bar
                  dataKey="REVENUE"
                  fill="#8b5cf6"
                  yAxisId="right"
                  name="Revenue"
                  barSize={barSize}
                  opacity={0.8}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Modal for expanded view (hidden as per requirement) */}
        <SparkChartModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={activeTab === "display" ? "Display Metrics Over Time" : "Attribution Metrics Over Time"}
          data={sortedData}
          dataKey={activeTab === "display" ? "CLICKS" : "TRANSACTIONS"}
          color={activeTab === "display" ? "#f59e0b" : "#ef4444"}
          gradientId={activeTab === "display" ? "impressions-clicks" : "transactions-revenue"}
          valueFormatter={activeTab === "display" 
            ? (value) => formatClicks(value)
            : (value) => formatTransactions(value)
          }
        />
      </CardContent>
    </Card>
  );
};

export default CombinedMetricsChart;

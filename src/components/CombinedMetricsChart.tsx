
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
import { formatNumber, parseDateString } from "@/lib/utils";
import SparkChartModal from "./SparkChartModal";

interface CombinedMetricsChartProps {
  data: any[];
  title?: string;
  chartToggleComponent?: React.ReactNode;
  onTabChange?: (tab: string) => void;
  initialTab?: string;
}

// Helper function to get complete date range from data
const getCompleteDateRange = (data: any[]): Date[] => {
  const dates = data
    .map(row => row.DATE || row.DAY_OF_WEEK)
    .filter(date => date)
    .map(dateStr => {
      // Handle day of week data differently
      if (/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.test(dateStr)) {
        return null; // Don't process day of week data for date ranges
      }
      return parseDateString(dateStr);
    })
    .filter(Boolean) as Date[];
    
  if (dates.length === 0) return [];
  
  dates.sort((a, b) => a.getTime() - b.getTime());
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  
  const result = [];
  const current = new Date(minDate);
  
  while (current <= maxDate) {
    result.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return result;
};

// Helper function to fill missing dates with zero values for combo chart
const fillMissingDatesForCombo = (processedData: any[], allDates: Date[]): any[] => {
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  
  // Check if we're dealing with day of week data
  const isDayOfWeekData = processedData.some(item => item.date && /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.test(item.date));
  
  // Don't fill gaps for day of week data
  if (isDayOfWeekData) {
    return processedData;
  }
  
  const dataByDate = new Map();
  
  // Create a map of existing data by date string
  processedData.forEach(item => {
    if (item.date) {
      dataByDate.set(item.date, item);
    }
  });
  
  // If no data, return empty array
  if (processedData.length === 0 || allDates.length === 0) return processedData;
  
  // Find the actual range of dates that have data
  const datesWithData = processedData
    .map(item => parseDateString(item.date))
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime());
    
  if (datesWithData.length === 0) return processedData;
  
  const firstDataDate = datesWithData[0]!;
  const lastDataDate = datesWithData[datesWithData.length - 1]!;
  
  // Generate complete time series, filling gaps with zero values between first and last data points
  const result = allDates
    .filter(date => date >= firstDataDate && date <= lastDataDate)
    .map(date => {
      const dateStr = dateFormat.format(date);
      const existingData = dataByDate.get(dateStr);
      
      if (existingData) {
        return existingData;
      } else {
        // Return zero values for missing dates to create trend line that goes to zero
        return {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          TRANSACTIONS: 0,
          REVENUE: 0
        };
      }
    });
    
  return result;
};

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

  // Get complete date range for filling gaps
  const completeDateRange = getCompleteDateRange(data);

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
  
  // Fill missing dates with zero values for continuous trend lines (only for date-based data)
  const filledData = fillMissingDatesForCombo(processedData, completeDateRange);
  
  // Only sort if we're dealing with dates, not days of week
  const sortedData = !isDayOfWeekData && filledData.some(item => item.date && !isNaN(new Date(item.date).getTime()))
    ? filledData.sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch (e) {
          return 0;
        }
      })
    : filledData; // For day of week, maintain original order

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
                  connectNulls={true}
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
                  connectNulls={true}
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

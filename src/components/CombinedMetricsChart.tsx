
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
  hideTitle?: boolean; // Add this prop to control title visibility
}

const CombinedMetricsChart = ({ 
  data, 
  title = "Campaign Performance", 
  chartToggleComponent,
  onTabChange,
  initialTab = "display",
  hideTitle = false // Add default value
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
    if (onTabChange) {
      onTabChange(value);
    }
  };

  // Determine if we're dealing with day-of-week data
  const isDayOfWeekData = data && data.length > 0 && data[0].hasOwnProperty("DAY_OF_WEEK");
  
  console.log(`CombinedMetricsChart: Is day of week data: ${isDayOfWeekData}`);
  
  // Sort data by day of week if needed
  const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const sortedData = isDayOfWeekData
    ? [...data].sort((a, b) => dayOrder.indexOf(a.DAY_OF_WEEK) - dayOrder.indexOf(b.DAY_OF_WEEK))
    : data;

  console.log(`CombinedMetricsChart: Processed data length: ${sortedData.length}, isDayOfWeekData: ${isDayOfWeekData}`);

  // Calculate bar size based on data type - significantly larger for day of week data to fill the chart
  const barSize = isDayOfWeekData ? 120 : 20; // Much wider bars for day of week data

  return (
    <Card className="w-full">
      {/* Only show CardHeader if hideTitle is false */}
      {!hideTitle && (
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {chartToggleComponent}
        </CardHeader>
      )}

      {/* If hideTitle is true, but we still want to show the toggle component, place it in a custom header */}
      {hideTitle && chartToggleComponent && (
        <div className="px-6 py-4 flex justify-end">
          {chartToggleComponent}
        </div>
      )}

      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
          </TabsList>
          
          <TabsContent value="display">
            <div className="h-[400px]">
              {sortedData && sortedData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={sortedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey={isDayOfWeekData ? "DAY_OF_WEEK" : "DATE"} 
                      tick={{ fontSize: 12 }}
                      tickFormatter={isDayOfWeekData ? undefined : (value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatImpressions}
                      domain={['auto', 'auto']}
                      label={{ value: 'Impressions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748B' } }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatClicks}
                      domain={['auto', 'auto']}
                      label={{ value: 'Clicks', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748B' } }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Impressions') return formatImpressions(value as number);
                        if (name === 'Clicks') return formatClicks(value as number);
                        return value;
                      }}
                      labelFormatter={(label) => {
                        if (isDayOfWeekData) return label;
                        try {
                          const date = new Date(label);
                          return date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                        } catch (e) {
                          return label;
                        }
                      }}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="IMPRESSIONS" 
                      name="Impressions" 
                      fill="#93C5FD" 
                      barSize={barSize}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="CLICKS" 
                      name="Clicks" 
                      stroke="#3B82F6" 
                      dot={false} 
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available for the selected filters
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="attribution">
            <div className="h-[400px]">
              {sortedData && sortedData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={sortedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey={isDayOfWeekData ? "DAY_OF_WEEK" : "DATE"}
                      tick={{ fontSize: 12 }}
                      tickFormatter={isDayOfWeekData ? undefined : (value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatTransactions}
                      domain={['auto', 'auto']}
                      label={{ value: 'Transactions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748B' } }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatRevenue}
                      domain={['auto', 'auto']}
                      label={{ value: 'Revenue', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748B' } }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Transactions') return formatTransactions(value as number);
                        if (name === 'Revenue') return formatRevenue(value as number);
                        return value;
                      }}
                      labelFormatter={(label) => {
                        if (isDayOfWeekData) return label;
                        try {
                          const date = new Date(label);
                          return date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                        } catch (e) {
                          return label;
                        }
                      }}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="TRANSACTIONS" 
                      name="Transactions" 
                      fill="#A5B4FC" 
                      barSize={barSize}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="REVENUE" 
                      name="Revenue" 
                      stroke="#6D28D9" 
                      dot={false} 
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available for the selected filters
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CombinedMetricsChart;

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { formatNumber, parseDateString, formatDateSortable } from "@/lib/utils";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";
import SparkChartModal from "./SparkChartModal";

interface CombinedMetricsChartProps {
  data: any[];
  title?: string;
  chartToggleComponent?: React.ReactNode;
  onTabChange?: (tab: string) => void;
  initialTab?: string;
  // New props for custom metrics
  customBarMetric?: string;
  customLineMetric?: string;
  // Chart mode selector to be rendered inside the chart
  chartModeSelector?: React.ReactNode;
  // Raw data for spend calculations (with campaign names)
  rawData?: any[];
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
  
  // Check if we're dealing with day of week data
  const isDayOfWeekData = processedData.some(item => item.date && /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.test(item.date));
  
  // Don't fill gaps for day of week data
  if (isDayOfWeekData) {
    return processedData;
  }
  
  // If no data, return empty array
  if (processedData.length === 0 || allDates.length === 0) return processedData;
  
  // Create a map of existing data by date string - normalize all dates to MM/DD/YY format
  const dataByDate = new Map();
  processedData.forEach(item => {
    if (item.date) {
      // Normalize the input date to MM/DD/YY format
      const parsedDate = parseDateString(item.date);
      if (parsedDate) {
        const normalizedDateStr = formatDateSortable(parsedDate);
        dataByDate.set(normalizedDateStr, {
          ...item,
          date: normalizedDateStr
        });
      }
    }
  });
  
  
  // Find the actual range of dates that have data
  const datesWithData = processedData
    .map(item => parseDateString(item.date))
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime());
    
  if (datesWithData.length === 0) return processedData;
  
  const firstDataDate = datesWithData[0]!;
  const lastDataDate = datesWithData[datesWithData.length - 1]!;
  
  // Generate complete time series only within the data range
  // Use consistent MM/DD/YY date format for proper sorting
  const result = [];
  for (const date of allDates) {
    if (date >= firstDataDate && date <= lastDataDate) {
      // Format date as MM/DD/YY for consistent sorting
      const dateStr = formatDateSortable(date);

      const existingData = dataByDate.get(dateStr);
      
      if (existingData) {
        // Use existing data as-is
        result.push(existingData);
      } else {
        // Fill gap with zero values
        result.push({
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          TRANSACTIONS: 0,
          REVENUE: 0
        });
      }
    }
  }
  
    
  return result;
};

const CombinedMetricsChart = ({
  data,
  title = "Campaign Performance",
  chartToggleComponent,
  onTabChange,
  initialTab = "display",
  customBarMetric = "IMPRESSIONS",
  customLineMetric = "CLICKS",
  chartModeSelector,
  rawData = []
}: CombinedMetricsChartProps) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const { extractAgencyInfo } = useCampaignFilter();

  console.log(`CombinedMetricsChart: Rendering with data length: ${data?.length}, activeTab: ${activeTab}, initialTab: ${initialTab}`);
  
  // Format functions for different metrics
  const getMetricFormatter = (metric: string) => {
    switch (metric) {
      case "IMPRESSIONS":
      case "CLICKS":
      case "TRANSACTIONS":
        return (value: number) => formatNumber(value);
      case "REVENUE":
        return (value: number) => `$${formatNumber(value)}`;
      default:
        return (value: number) => formatNumber(value);
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "IMPRESSIONS":
        return "Impressions";
      case "CLICKS":
        return "Clicks";
      case "TRANSACTIONS":
        return "Transactions";
      case "REVENUE":
        return "Attributed Sales";
      default:
        return metric;
    }
  };

  // Custom tooltip formatter function
  const formatTooltipValue = (value: any, name: string) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return [value, name];
    
    // Handle revenue formatting with dollar signs and cents
    if (name === "REVENUE" || name === "Revenue" || name.toLowerCase().includes("revenue")) {
      return [`$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Attributed Sales"];
    }
    
    // Handle other metrics with comma formatting
    switch (name) {
      case "IMPRESSIONS":
      case "Impressions":
        return [numValue.toLocaleString(), "Impressions"];
      case "CLICKS":
      case "Clicks":
        return [numValue.toLocaleString(), "Clicks"];
      case "TRANSACTIONS":
      case "Transactions":
        return [numValue.toLocaleString(), "Transactions"];
      default:
        return [numValue.toLocaleString(), name];
    }
  };

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

  // Function to process spend data for MediaJel Direct vs Channel Partners
  const processSpendData = () => {
    const dataToUse = rawData.length > 0 ? rawData : data;
    const spendByDate = new Map();

    dataToUse.forEach(row => {
      const date = row.DATE || row.date;
      if (!date || date === 'Totals') return;

      const campaignName = row["CAMPAIGN ORDER NAME"] || row.campaignName || "";
      let spend = Number(row.SPEND || row.spend || 0);

      // Apply Orangellow CPM to $7 conversion
      const { agency, abbreviation } = extractAgencyInfo(campaignName);
      if (abbreviation === 'OG' || abbreviation === 'SM' || agency === 'Orangellow') {
        // Convert CPM campaigns to $7 CPM equivalent
        const impressions = Number(row.IMPRESSIONS || row.impressions || 0);
        if (impressions > 0) {
          spend = (impressions / 1000) * 7; // $7 CPM
        }
      }

      // Determine if it's MediaJel Direct or Channel Partners
      const isMediaJelDirect = agency === 'MediaJel Direct' || abbreviation === 'MJ';

      if (!spendByDate.has(date)) {
        spendByDate.set(date, {
          date,
          MediaJelDirect: 0,
          ChannelPartners: 0
        });
      }

      const dayData = spendByDate.get(date);
      if (isMediaJelDirect) {
        dayData.MediaJelDirect += spend;
      } else {
        dayData.ChannelPartners += spend;
      }
    });

    return Array.from(spendByDate.values()).sort((a, b) => {
      const dateA = parseDateString(a.date);
      const dateB = parseDateString(b.date);
      return dateA && dateB ? dateA.getTime() - dateB.getTime() : 0;
    });
  };

  // Process data to ensure we have all required fields and normalize dates
  const processedData = data
    .filter(item => item && (item.DATE || item.DAY_OF_WEEK))
    .map(item => {
      let dateStr = item.DATE || item.DAY_OF_WEEK;

      // Normalize date format to MM/DD/YY for consistent sorting (only for DATE, not DAY_OF_WEEK)
      if (item.DATE) {
        const parsedDate = parseDateString(item.DATE);
        if (parsedDate) {
          dateStr = formatDateSortable(parsedDate);
        }
      }

      return {
        date: dateStr,
        IMPRESSIONS: Number(item.IMPRESSIONS || 0),
        CLICKS: Number(item.CLICKS || 0),
        TRANSACTIONS: Number(item.TRANSACTIONS || 0),
        REVENUE: Number(item.REVENUE || 0),
      };
    });

  // Check if we're dealing with day of week data
  const isDayOfWeekData = processedData.some(item => item.date && /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.test(item.date));
  
  // For spend mode, use different data processing
  const spendData = activeTab === "spend" ? processSpendData() : [];
  const dataForChart = activeTab === "spend" ? spendData : processedData;

  // Fill missing dates with zero values for continuous trend lines (only for date-based data)
  const filledData = activeTab === "spend" ? spendData : fillMissingDatesForCombo(processedData, completeDateRange);
  
  // Only sort if we're dealing with dates, not days of week
  const sortedData = !isDayOfWeekData && filledData.some(item => item.date && !isNaN(new Date(item.date).getTime()))
    ? filledData.sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch (e) {
          return 0;
        }
      })
    : filledData;

  console.log(`CombinedMetricsChart: Processed data length: ${sortedData.length}, isDayOfWeekData: ${isDayOfWeekData}`);

  // Calculate bar size based on data type
  const barSize = isDayOfWeekData ? 120 : 80;

  // Render different chart configurations based on active tab
  const renderChart = () => {
    if (activeTab === "display") {
      return (
        <ComposedChart data={sortedData}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 10 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 10 }} />
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <Tooltip 
            formatter={formatTooltipValue}
            contentStyle={{ 
              backgroundColor: "rgba(255, 255, 255, 0.95)", 
              border: "1px solid #eee",
              borderRadius: "4px",
              padding: "8px 12px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
            }}
          />
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
      );
    } else if (activeTab === "attribution") {
      return (
        <ComposedChart data={sortedData}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 10 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `$${formatNumber(value)}`} tick={{ fontSize: 10 }} />
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <Tooltip 
            formatter={formatTooltipValue}
            contentStyle={{ 
              backgroundColor: "rgba(255, 255, 255, 0.95)", 
              border: "1px solid #eee",
              borderRadius: "4px",
              padding: "8px 12px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
            }}
          />
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
            name="Attributed Sales"
            barSize={barSize}
            opacity={0.8}
          />
        </ComposedChart>
      );
    } else if (activeTab === "custom") {
      const barFormatter = getMetricFormatter(customBarMetric);
      const lineFormatter = getMetricFormatter(customLineMetric);
      const barLabel = getMetricLabel(customBarMetric);
      const lineLabel = getMetricLabel(customLineMetric);
      
      return (
        <ComposedChart data={sortedData}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tickFormatter={(value) => barFormatter(value)} tick={{ fontSize: 10 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => lineFormatter(value)} tick={{ fontSize: 10 }} />
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <Tooltip 
            formatter={formatTooltipValue}
            contentStyle={{ 
              backgroundColor: "rgba(255, 255, 255, 0.95)", 
              border: "1px solid #eee",
              borderRadius: "4px",
              padding: "8px 12px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
            }}
          />
          <Bar
            dataKey={customBarMetric}
            fill="#3b82f6"
            yAxisId="left"
            name={barLabel}
            barSize={barSize}
            opacity={0.8}
          />
          <Line
            type="monotone"
            dataKey={customLineMetric}
            stroke="#eab308"
            strokeWidth={2}
            yAxisId="right"
            name={lineLabel}
            dot={false}
            connectNulls={true}
          />
        </ComposedChart>
      );
    } else if (activeTab === "spend") {
      return (
        <BarChart data={sortedData}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={(value) => `$${formatNumber(value)}`} tick={{ fontSize: 10 }} />
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <Tooltip
            formatter={(value: any, name: string) => [
              `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              name === 'MediaJelDirect' ? 'MediaJel Direct' : 'Channel Partners'
            ]}
            labelFormatter={(label: string) => `Date: ${label}`}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const mediaJelValue = payload.find(p => p.dataKey === 'MediaJelDirect')?.value || 0;
                const channelPartnersValue = payload.find(p => p.dataKey === 'ChannelPartners')?.value || 0;
                const total = Number(mediaJelValue) + Number(channelPartnersValue);

                return (
                  <div className="bg-white/95 border border-gray-200 rounded p-3 shadow-lg">
                    <p className="font-medium mb-2">{`Date: ${label}`}</p>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-sm">MediaJel Direct: ${Number(mediaJelValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                        <span className="text-sm">Channel Partners: ${Number(channelPartnersValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-1 mt-2">
                        <span className="text-sm font-medium">Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="MediaJelDirect"
            stackId="spend"
            fill="#3b82f6"
            name="MediaJel Direct"
            barSize={barSize}
          />
          <Bar
            dataKey="ChannelPartners"
            stackId="spend"
            fill="#fbbf24"
            name="Channel Partners"
            barSize={barSize}
          />
        </BarChart>
      );
    }

    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <CardTitle>{title}</CardTitle>
            {/* Custom Legend */}
            <div className="flex items-center space-x-4 text-xs">
              {activeTab === "display" && (
                <>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-2 bg-green-400 opacity-80"></div>
                    <span>Impressions</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-0.5 bg-amber-500"></div>
                    <span>Clicks</span>
                  </div>
                </>
              )}
              {activeTab === "attribution" && (
                <>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    <span>Transactions</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-2 bg-purple-500 opacity-80"></div>
                    <span>Attributed Sales</span>
                  </div>
                </>
              )}
              {activeTab === "spend" && (
                <>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-2 bg-blue-500"></div>
                    <span>MediaJel Direct</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-2 bg-yellow-400"></div>
                    <span>Channel Partners</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {chartModeSelector && (
              <div>{chartModeSelector}</div>
            )}
            {chartToggleComponent && (
              <div>{chartToggleComponent}</div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
        
        {/* Modal for expanded view (hidden as per requirement) */}
        <SparkChartModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={activeTab === "display" ? "Display Metrics Over Time" : activeTab === "attribution" ? "Attribution Metrics Over Time" : "Custom Metrics Over Time"}
          data={sortedData}
          dataKey={activeTab === "display" ? "CLICKS" : activeTab === "attribution" ? "TRANSACTIONS" : customLineMetric}
          color={activeTab === "display" ? "#f59e0b" : activeTab === "attribution" ? "#ef4444" : "#eab308"}
          gradientId={activeTab === "display" ? "impressions-clicks" : activeTab === "attribution" ? "transactions-revenue" : "custom-metrics"}
          valueFormatter={activeTab === "display" 
            ? (value) => formatNumber(value)
            : activeTab === "attribution" 
            ? (value) => formatNumber(value)
            : (value) => getMetricFormatter(customLineMetric)(value)
          }
        />
      </CardContent>
    </Card>
  );
};

export default CombinedMetricsChart;

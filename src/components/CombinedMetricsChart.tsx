
import React, { useState } from "react";
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
import { Maximize } from "lucide-react";
import SparkChartModal from "./SparkChartModal";
import { formatNumber } from "@/lib/utils";
import { ChartToggle } from "./ChartToggle";

interface CombinedMetricsChartProps {
  data: any[];
  title?: string;
  chartToggleComponent?: React.ReactNode;
  onTabChange?: (tab: string) => void;
  initialTab?: string;
}

const CombinedMetricsChart = ({ 
  data, 
  title = "Metrics Over Time", 
  chartToggleComponent,
  onTabChange,
  initialTab = "display" 
}: CombinedMetricsChartProps) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  
  // Format functions for different metrics
  const formatImpressions = (value: number) => formatNumber(value);
  const formatClicks = (value: number) => formatNumber(value);
  const formatTransactions = (value: number) => formatNumber(value);
  const formatRevenue = (value: number) => `$${formatNumber(value)}`;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
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
        <CardContent className="h-[300px] flex items-center justify-center">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Process data to ensure we have all required fields
  const processedData = data
    .filter(item => item && item.DATE && item.DATE !== 'Totals')
    .map(item => ({
      date: item.DATE,
      IMPRESSIONS: Number(item.IMPRESSIONS || 0),
      CLICKS: Number(item.CLICKS || 0),
      TRANSACTIONS: Number(item.TRANSACTIONS || 0),
      REVENUE: Number(item.REVENUE || 0),
    }))
    .sort((a, b) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (e) {
        return 0;
      }
    });

  // Handle modal opening with appropriate data
  const handleOpenModal = () => {
    setModalOpen(true);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center space-x-2">
            {chartToggleComponent && (
              <div className="mr-4">{chartToggleComponent}</div>
            )}
            <span 
              className="cursor-pointer text-gray-500 hover:text-gray-700"
              onClick={handleOpenModal}
            >
              <Maximize className="h-5 w-5" />
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="display"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="display">Display Metrics</TabsTrigger>
            <TabsTrigger value="attribution">Attribution Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="display" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedData}>
                <XAxis dataKey="date" />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={formatImpressions}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatClicks}
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
                  barSize={20}
                  opacity={0.8}
                />
                <Line
                  type="monotone"
                  dataKey="CLICKS"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  yAxisId="right"
                  name="Clicks"
                  dot={{ r: 1 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="attribution" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedData}>
                <XAxis dataKey="date" />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={formatTransactions}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatRevenue}
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
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  yAxisId="left"
                  name="Transactions"
                  dot={{ r: 1 }}
                />
                <Bar
                  dataKey="REVENUE"
                  fill="#ef4444"
                  yAxisId="right"
                  name="Revenue"
                  barSize={20}
                  opacity={0.8}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
        
        {/* Modal for expanded view */}
        <SparkChartModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={activeTab === "display" ? "Display Metrics Over Time" : "Attribution Metrics Over Time"}
          data={processedData}
          dataKey={activeTab === "display" ? "CLICKS" : "TRANSACTIONS"}
          color={activeTab === "display" ? "#f59e0b" : "#8b5cf6"}
          gradientId={activeTab === "display" ? "impressions-clicks" : "transactions-revenue"}
          chartType="composed"
          showBar={true}
          barDataKey={activeTab === "display" ? "IMPRESSIONS" : "REVENUE"}
          barColor={activeTab === "display" ? "#4ade80" : "#ef4444"}
          valueFormatter={activeTab === "display" 
            ? (value) => formatClicks(value)
            : (value) => formatTransactions(value)
          }
          barValueFormatter={activeTab === "display" 
            ? (value) => formatImpressions(value)
            : (value) => formatRevenue(value)
          }
        />
      </CardContent>
    </Card>
  );
};

export default CombinedMetricsChart;

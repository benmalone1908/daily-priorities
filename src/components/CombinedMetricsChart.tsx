
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
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

interface CombinedMetricsChartProps {
  data: any[];
  title?: string;
}

const CombinedMetricsChart = ({ data, title = "Metrics Over Time" }: CombinedMetricsChartProps) => {
  const [activeTab, setActiveTab] = useState<string>("display");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  
  // Format functions for different metrics
  const formatImpressions = (value: number) => formatNumber(value);
  const formatClicks = (value: number) => formatNumber(value);
  const formatTransactions = (value: number) => formatNumber(value);
  const formatRevenue = (value: number) => `$${formatNumber(value)}`;

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
        <CardTitle className="flex justify-between">
          <span>{title}</span>
          <span 
            className="cursor-pointer text-gray-500 hover:text-gray-700"
            onClick={handleOpenModal}
          >
            <Maximize className="h-5 w-5" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="display"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="display">Display Metrics</TabsTrigger>
            <TabsTrigger value="attribution">Attribution Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="display" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedData}>
                <defs>
                  <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="IMPRESSIONS"
                  stroke="#4ade80"
                  fill="url(#colorImpressions)"
                  yAxisId="left"
                  name="Impressions"
                />
                <Line
                  type="monotone"
                  dataKey="CLICKS"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  yAxisId="right"
                  name="Clicks"
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
                />
                <Bar
                  dataKey="REVENUE"
                  fill="#ef4444"
                  yAxisId="right"
                  name="Revenue"
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
          secondaryDataKey={activeTab === "display" ? "IMPRESSIONS" : undefined}
          secondaryColor={activeTab === "display" ? "#4ade80" : undefined}
          secondaryGradientId={activeTab === "display" ? "impressions" : undefined}
          chartType="composed"
          showBar={activeTab === "attribution"}
          barDataKey={activeTab === "attribution" ? "REVENUE" : undefined}
          barColor="#ef4444"
          valueFormatter={activeTab === "display" 
            ? (value) => formatClicks(value)
            : (value) => formatTransactions(value)
          }
          barValueFormatter={formatRevenue}
        />
      </CardContent>
    </Card>
  );
};

export default CombinedMetricsChart;

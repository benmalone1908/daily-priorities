
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnomalyDetails from "./AnomalyDetails";

interface DashboardProps {
  data: any[];
}

const Dashboard = ({ data }: DashboardProps) => {
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  const campaigns = useMemo(() => {
    if (!data.length) return [];
    return Array.from(new Set(data.map(row => row["CAMPAIGN ORDER NAME"]))).sort();
  }, [data]);

  const anomalies = useMemo(() => {
    if (!data.length) return null;

    const campaignData: Record<string, any[]> = {};
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (!campaignData[campaignName]) {
        campaignData[campaignName] = [];
      }
      campaignData[campaignName].push(row);
    });

    const metrics = ["IMPRESSIONS", "CLICKS", "REVENUE"];
    const results: Record<string, any> = {};

    metrics.forEach((metric) => {
      let allAnomalies: any[] = [];

      Object.entries(campaignData).forEach(([campaign, campaignRows]) => {
        const values = campaignRows.map((row) => Number(row[metric]) || 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
        );

        const threshold = stdDev * 2;

        const campaignAnomalies = campaignRows.filter((row) => {
          const value = Number(row[metric]) || 0;
          return Math.abs(value - mean) > threshold;
        }).map(row => ({
          ...row,
          campaign,
          mean,
          actualValue: Number(row[metric]) || 0,
          deviation: ((Number(row[metric]) || 0) - mean) / mean * 100
        }));

        allAnomalies = [...allAnomalies, ...campaignAnomalies];
      });

      results[metric] = {
        anomalies: allAnomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      };
    });

    return results;
  }, [data]);

  const aggregatedData = useMemo(() => {
    if (!data.length) return [];

    const filteredData = selectedCampaign === "all" 
      ? data 
      : data.filter(row => row["CAMPAIGN ORDER NAME"] === selectedCampaign);

    const dateGroups = filteredData.reduce((acc, row) => {
      const date = row.DATE;
      if (!acc[date]) {
        acc[date] = {
          DATE: date,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0
        };
      }
      acc[date].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      acc[date].CLICKS += Number(row.CLICKS) || 0;
      acc[date].REVENUE += Number(row.REVENUE) || 0;
      return acc;
    }, {});

    return Object.values(dateGroups).sort((a: any, b: any) => 
      new Date(a.DATE).getTime() - new Date(b.DATE).getTime()
    );
  }, [data, selectedCampaign]);

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const formatRevenue = (value: number) => {
    return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  if (!anomalies) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Impression Anomalies"
          anomalies={anomalies.IMPRESSIONS.anomalies}
          metric="IMPRESSIONS"
        />
        <MetricCard
          title="Click Anomalies"
          anomalies={anomalies.CLICKS.anomalies}
          metric="CLICKS"
        />
        <MetricCard
          title="Revenue Anomalies"
          anomalies={anomalies.REVENUE.anomalies}
          metric="REVENUE"
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Display Metrics Over Time</h3>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aggregatedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="DATE" />
              <YAxis 
                yAxisId="left"
                orientation="left"
                stroke="#4ade80"
                label={{ value: 'Impressions', angle: -90, position: 'insideLeft' }}
                tickFormatter={formatNumber}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                label={{ value: 'Clicks', angle: 90, position: 'insideRight' }}
                tickFormatter={formatNumber}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [formatNumber(value), name]}
              />
              <Bar
                yAxisId="left"
                dataKey="IMPRESSIONS"
                fill="#4ade80"
                opacity={0.8}
                name="Impressions"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="CLICKS"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Clicks"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Attribution Revenue Over Time</h3>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aggregatedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="DATE" />
              <YAxis 
                yAxisId="left"
                orientation="left"
                stroke="#4ade80"
                label={{ value: 'Impressions', angle: -90, position: 'insideLeft' }}
                tickFormatter={formatNumber}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ef4444"
                label={{ value: 'Revenue ($)', angle: 90, position: 'insideRight' }}
                tickFormatter={formatRevenue}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === "Revenue") return [formatRevenue(value), name];
                  return [formatNumber(value), name];
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="IMPRESSIONS"
                fill="#4ade80"
                opacity={0.8}
                name="Impressions"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="REVENUE"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Revenue"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

const MetricCard = ({
  title,
  anomalies,
  metric
}: {
  title: string;
  anomalies: any[];
  metric: string;
}) => (
  <Card className="p-6 transition-all duration-300 hover:shadow-lg">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-medium text-muted-foreground">{title}</h3>
        <p className="mt-2 text-2xl font-bold">{anomalies.length}</p>
      </div>
      {anomalies.length > 0 && (
        <div
          className={`p-2 rounded-full ${
            anomalies[0].deviation > 0
              ? "bg-alert/10 text-alert"
              : "bg-warning/10 text-warning"
          }`}
        >
          {anomalies[0].deviation > 0 ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
        </div>
      )}
    </div>
    {anomalies.length > 0 && (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span>Top anomalies:</span>
          </div>
          <AnomalyDetails anomalies={anomalies} metric={metric} />
        </div>
        {anomalies.slice(0, 2).map((anomaly, idx) => (
          <div key={idx} className="text-sm space-y-1">
            <div className="font-medium">{anomaly.campaign}</div>
            <div className="text-muted-foreground">
              Date: {anomaly.DATE} - {metric}: {anomaly.actualValue.toLocaleString()} 
              <span className={anomaly.deviation > 0 ? "text-alert" : "text-warning"}>
                {" "}({anomaly.deviation > 0 ? "+" : ""}{anomaly.deviation.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);

export default Dashboard;

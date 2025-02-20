
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

interface DashboardProps {
  data: any[];
}

const Dashboard = ({ data }: DashboardProps) => {
  const anomalies = useMemo(() => {
    if (!data.length) return null;

    // Group data by campaign
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

      // Analyze each campaign separately
      Object.entries(campaignData).forEach(([campaign, campaignRows]) => {
        const values = campaignRows.map((row) => Number(row[metric]) || 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
        );

        const threshold = stdDev * 2; // 2 standard deviations

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
        <h3 className="mb-4 text-lg font-semibold">Metrics Over Time</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="DATE" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="IMPRESSIONS"
                stroke="#4ade80"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="CLICKS"
                stroke="#f59e0b"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="REVENUE"
                stroke="#ef4444"
                dot={false}
              />
            </LineChart>
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
        <div className="flex items-center text-sm text-muted-foreground">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span>Top anomalies:</span>
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

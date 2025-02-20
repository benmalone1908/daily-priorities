
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

    const metrics = ["IMPRESSIONS", "CLICKS", "REVENUE"];
    const results: Record<string, any> = {};

    metrics.forEach((metric) => {
      const values = data.map((row) => Number(row[metric]));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
      );

      const threshold = stdDev * 2; // 2 standard deviations

      results[metric] = {
        mean,
        stdDev,
        anomalies: data.filter(
          (row) => Math.abs(Number(row[metric]) - mean) > threshold
        ),
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
          count={anomalies.IMPRESSIONS.anomalies.length}
          trend={
            anomalies.IMPRESSIONS.anomalies[0]?.IMPRESSIONS >
            anomalies.IMPRESSIONS.mean
              ? "up"
              : "down"
          }
        />
        <MetricCard
          title="Click Anomalies"
          count={anomalies.CLICKS.anomalies.length}
          trend={
            anomalies.CLICKS.anomalies[0]?.CLICKS > anomalies.CLICKS.mean
              ? "up"
              : "down"
          }
        />
        <MetricCard
          title="Revenue Anomalies"
          count={anomalies.REVENUE.anomalies.length}
          trend={
            anomalies.REVENUE.anomalies[0]?.REVENUE > anomalies.REVENUE.mean
              ? "up"
              : "down"
          }
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
  count,
  trend,
}: {
  title: string;
  count: number;
  trend: "up" | "down";
}) => (
  <Card className="p-6 transition-all duration-300 hover:shadow-lg">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-medium text-muted-foreground">{title}</h3>
        <p className="mt-2 text-2xl font-bold">{count}</p>
      </div>
      <div
        className={`p-2 rounded-full ${
          trend === "up"
            ? "bg-alert/10 text-alert"
            : "bg-warning/10 text-warning"
        }`}
      >
        {trend === "up" ? (
          <TrendingUp className="w-5 h-5" />
        ) : (
          <TrendingDown className="w-5 h-5" />
        )}
      </div>
    </div>
    {count > 0 && (
      <div className="flex items-center mt-4 text-sm text-muted-foreground">
        <AlertTriangle className="w-4 h-4 mr-2" />
        <span>Requires attention</span>
      </div>
    )}
  </Card>
);

export default Dashboard;

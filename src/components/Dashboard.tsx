import { useMemo, useState, useRef, useEffect } from "react";
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
import { AlertTriangle, TrendingDown, TrendingUp, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnomalyDetails from "./AnomalyDetails";
import { getColorClasses } from "@/utils/anomalyColors";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect, Option } from "./MultiSelect";

interface DashboardProps {
  data: any[];
  metricsData?: any[];
  revenueData?: any[];
  selectedMetricsCampaigns?: string[];
  selectedRevenueCampaigns?: string[];
  selectedRevenueAdvertisers?: string[];
  onMetricsCampaignsChange?: (selected: string[]) => void;
  onRevenueCampaignsChange?: (selected: string[]) => void;
  onRevenueAdvertisersChange?: (selected: string[]) => void;
  sortedCampaignOptions?: string[];
  sortedAdvertiserOptions?: string[];
}

interface WeeklyData {
  periodStart: string;
  periodEnd: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  ROAS: number;
  count: number;
}

interface WeeklyAggregation {
  weekStart: string;
  [metric: string]: any;
  rows: any[];
}

type AnomalyPeriod = "daily" | "weekly";

const MetricCard = ({ title, anomalies, metric, anomalyPeriod }: { 
  title: string; 
  anomalies: any[]; 
  metric: string;
  anomalyPeriod: AnomalyPeriod;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);

  const handleAnomalyClick = (anomaly: any) => {
    setSelectedAnomaly(anomaly);
    setShowDetails(true);
  };

  return (
    <Card className="p-4 relative">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">{title}</h4>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{anomalies.length} found</span>
          <AlertTriangle 
            className={`h-4 w-4 ${anomalies.length > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} 
          />
        </div>
      </div>
      
      {anomalies.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
          {anomalies.slice(0, 5).map((anomaly, index) => {
            const deviation = anomaly.deviation;
            const colorClasses = getColorClasses(deviation);
            const isIncrease = deviation > 0;
            const absDeviation = Math.abs(deviation).toFixed(1);
            
            return (
              <div
                key={`${anomaly.campaign}-${index}-${anomaly.periodType}`}
                className="p-2 border rounded-md cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleAnomalyClick(anomaly)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-medium truncate max-w-[70%]">
                    {anomaly.campaign}
                  </div>
                  <div className={`text-xs font-bold flex items-center gap-1 ${colorClasses}`}>
                    {isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {absDeviation}%
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {anomaly.periodType === "daily" ? anomaly.DATE : `Period: ${anomaly.DATE}`}
                </div>
                <div className="text-xs flex justify-between mt-1">
                  <span>Expected: {metric === "REVENUE" ? `$${Math.round(anomaly.mean)}` : Math.round(anomaly.mean).toLocaleString()}</span>
                  <span>Actual: {metric === "REVENUE" ? `$${Math.round(anomaly.actualValue)}` : Math.round(anomaly.actualValue).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          
          {anomalies.length > 5 && (
            <div className="text-xs text-center text-muted-foreground py-1">
              + {anomalies.length - 5} more anomalies
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-[100px] text-sm text-muted-foreground">
          No {anomalyPeriod} anomalies detected
        </div>
      )}
      
      {showDetails && selectedAnomaly && (
        <AnomalyDetails
          anomalies={[selectedAnomaly]}
          metric={metric}
          anomalyPeriod={anomalyPeriod}
        />
      )}
    </Card>
  );
};

const Dashboard = ({ 
  data,
  metricsData,
  revenueData,
  selectedMetricsCampaigns = [],
  selectedRevenueCampaigns = [],
  selectedRevenueAdvertisers = [],
  onMetricsCampaignsChange,
  onRevenueCampaignsChange,
  onRevenueAdvertisersChange,
  sortedCampaignOptions = [],
  sortedAdvertiserOptions = []
}: DashboardProps) => {
  const filteredMetricsData = useMemo(() => {
    // Filter logic for metrics data
    return metricsData; // Placeholder for actual filtering logic
  }, [metricsData]);

  const filteredRevenueData = useMemo(() => {
    // Filter logic for revenue data
    return revenueData; // Placeholder for actual filtering logic
  }, [revenueData]);

  return (
    <div>
      <h2 className="text-lg font-bold">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard title="Metrics" anomalies={filteredMetricsData} metric="METRICS" anomalyPeriod="weekly" />
        <MetricCard title="Revenue" anomalies={filteredRevenueData} metric="REVENUE" anomalyPeriod="weekly" />
      </div>
    </div>
  );
};

export const Dashboard = Dashboard;
export default Dashboard;

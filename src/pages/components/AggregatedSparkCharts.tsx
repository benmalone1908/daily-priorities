
import { useState, useMemo } from "react";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { getColorClasses } from "@/utils/anomalyColors";
import { TrendingDown, TrendingUp, Maximize } from "lucide-react";
import SparkChartModal from "@/components/SparkChartModal";

type MetricType = 
  | "impressions" 
  | "clicks" 
  | "ctr" 
  | "transactions" 
  | "revenue" 
  | "roas";

interface ModalData {
  isOpen: boolean;
  title: string;
  metricType: MetricType;
  data: any[];
}

interface AggregatedSparkChartsProps {
  data: any[];
}

// Improved Aggregated Spark Charts component that matches the campaign row style
const AggregatedSparkCharts = ({ data }: AggregatedSparkChartsProps) => {
  const { showAggregatedSparkCharts } = useCampaignFilter();
  const [modalData, setModalData] = useState<ModalData>({
    isOpen: false,
    title: "",
    metricType: "impressions",
    data: []
  });
  
  if (!showAggregatedSparkCharts || !data || data.length === 0) {
    return null;
  }

  // Group data by date for time series
  const timeSeriesData = useMemo(() => {
    const dateGroups: Record<string, any> = {};
    
    data.forEach(row => {
      if (!row || !row.DATE || row.DATE === 'Totals') return;
      
      const dateStr = String(row.DATE).trim();
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0
        };
      }
      
      dateGroups[dateStr].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      dateGroups[dateStr].CLICKS += Number(row.CLICKS) || 0;
      dateGroups[dateStr].REVENUE += Number(row.REVENUE) || 0;
      dateGroups[dateStr].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
    });
    
    return Object.values(dateGroups).sort((a: any, b: any) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (err) {
        return 0;
      }
    });
  }, [data]);
  
  // Calculate totals
  const totals = useMemo(() => {
    let impressions = 0;
    let clicks = 0;
    let revenue = 0;
    let transactions = 0;
    
    timeSeriesData.forEach(day => {
      impressions += Number(day.IMPRESSIONS) || 0;
      clicks += Number(day.CLICKS) || 0;
      revenue += Number(day.REVENUE) || 0;
      transactions += Number(day.TRANSACTIONS) || 0;
    });
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const spend = (impressions * 15) / 1000; // Estimated spend based on $15 CPM
    const roas = spend > 0 ? revenue / spend : 0;
    
    return { impressions, clicks, ctr, revenue, transactions, roas };
  }, [timeSeriesData]);
  
  // Calculate trends (comparing last two data points)
  const trends = useMemo(() => {
    if (timeSeriesData.length < 2) return {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      revenue: 0,
      transactions: 0,
      roas: 0
    };
    
    const last = timeSeriesData[timeSeriesData.length - 1];
    const secondLast = timeSeriesData[timeSeriesData.length - 2];
    
    const lastCTR = last.IMPRESSIONS > 0 ? (last.CLICKS / last.IMPRESSIONS) * 100 : 0;
    const secondLastCTR = secondLast.IMPRESSIONS > 0 ? (secondLast.CLICKS / secondLast.IMPRESSIONS) * 100 : 0;
    
    const lastSpend = (last.IMPRESSIONS * 15) / 1000;
    const secondLastSpend = (secondLast.IMPRESSIONS * 15) / 1000;
    
    const lastROAS = lastSpend > 0 ? last.REVENUE / lastSpend : 0;
    const secondLastROAS = secondLastSpend > 0 ? secondLast.REVENUE / secondLastSpend : 0;
    
    return {
      impressions: calculatePercentChange(last.IMPRESSIONS, secondLast.IMPRESSIONS),
      clicks: calculatePercentChange(last.CLICKS, secondLast.CLICKS),
      ctr: calculatePercentChange(lastCTR, secondLastCTR),
      revenue: calculatePercentChange(last.REVENUE, secondLast.REVENUE),
      transactions: calculatePercentChange(last.TRANSACTIONS, secondLast.TRANSACTIONS),
      roas: calculatePercentChange(lastROAS, secondLastROAS)
    };
  }, [timeSeriesData]);
  
  function calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // Format functions
  const formatNumber = (value: number): string => value.toLocaleString();
  const formatRevenue = (value: number): string => `$${Math.round(value).toLocaleString()}`;
  const formatCTR = (value: number): string => `${value.toFixed(2)}%`;
  const formatROAS = (value: number): string => value.toFixed(2);
  
  const handleChartClick = (metricType: MetricType, title: string) => {
    setModalData({
      isOpen: true,
      title: `All Campaigns - ${title}`,
      metricType,
      data: timeSeriesData
    });
  };

  const getMetricDetails = (metricType: MetricType) => {
    switch(metricType) {
      case "impressions":
        return {
          title: "Impressions",
          color: "#4ade80",
          formatter: (value: number) => formatNumber(value)
        };
      case "clicks":
        return {
          title: "Clicks",
          color: "#f59e0b",
          formatter: (value: number) => formatNumber(value)
        };
      case "ctr":
        return {
          title: "CTR",
          color: "#0ea5e9",
          formatter: (value: number) => formatCTR(value)
        };
      case "transactions":
        return {
          title: "Transactions",
          color: "#8b5cf6",
          formatter: (value: number) => formatNumber(value)
        };
      case "revenue":
        return {
          title: "Revenue",
          color: "#ef4444",
          formatter: (value: number) => formatRevenue(value)
        };
      case "roas":
        return {
          title: "ROAS",
          color: "#d946ef",
          formatter: (value: number) => formatROAS(value)
        };
    }
  };
  
  // Render a metric card with chart
  const renderMetricCard = (title: string, value: number, trend: number, formatter: (val: number) => string, data: any[], dataKey: string, color: string, metricType: MetricType) => {
    const colorClass = getColorClasses(trend).split(' ').find(c => c.startsWith('text-')) || '';
    const gradientId = `gradient-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    return (
      <Card className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="text-sm font-medium">{title}</h4>
            <div className="text-base font-bold mt-1">
              {formatter(value)}
            </div>
          </div>
          
          <div className={`flex items-center text-xs ${colorClass} mt-1`}>
            {trend > 0 ? (
              <TrendingUp className="mr-1 h-3 w-3" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3" />
            )}
            <span>
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="h-16 mt-1 cursor-pointer relative group" onClick={() => handleChartClick(metricType, title)}>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize className="h-5 w-5 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                fillOpacity={1}
                fill={`url(#${gradientId})`} 
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };
  
  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold">All Campaigns</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {renderMetricCard(
          "Impressions", 
          totals.impressions, 
          trends.impressions, 
          formatNumber, 
          timeSeriesData, 
          "IMPRESSIONS", 
          "#4ade80",
          "impressions"
        )}
        
        {renderMetricCard(
          "Clicks", 
          totals.clicks, 
          trends.clicks, 
          formatNumber, 
          timeSeriesData, 
          "CLICKS", 
          "#f59e0b",
          "clicks"
        )}
        
        {renderMetricCard(
          "CTR", 
          totals.ctr, 
          trends.ctr, 
          formatCTR, 
          timeSeriesData.map(d => ({...d, CTR: d.IMPRESSIONS > 0 ? (d.CLICKS / d.IMPRESSIONS) * 100 : 0})), 
          "CTR", 
          "#0ea5e9",
          "ctr"
        )}
        
        {renderMetricCard(
          "Transactions", 
          totals.transactions, 
          trends.transactions, 
          formatNumber, 
          timeSeriesData, 
          "TRANSACTIONS", 
          "#8b5cf6",
          "transactions"
        )}
        
        {renderMetricCard(
          "Revenue", 
          totals.revenue, 
          trends.revenue, 
          formatRevenue, 
          timeSeriesData, 
          "REVENUE", 
          "#ef4444",
          "revenue"
        )}
        
        {renderMetricCard(
          "ROAS", 
          totals.roas, 
          trends.roas, 
          formatROAS, 
          timeSeriesData.map(d => {
            const spend = (d.IMPRESSIONS * 15) / 1000;
            return {...d, ROAS: spend > 0 ? d.REVENUE / spend : 0};
          }), 
          "ROAS", 
          "#d946ef",
          "roas"
        )}
      </div>
      
      {/* Modal for expanded chart view */}
      {modalData.isOpen && (
        <SparkChartModal
          open={modalData.isOpen}
          onOpenChange={(open) => setModalData({ ...modalData, isOpen: open })}
          title={modalData.title}
          data={modalData.data}
          dataKey={modalData.metricType === "ctr" ? "CTR" : 
                  modalData.metricType === "roas" ? "ROAS" : 
                  modalData.metricType.toUpperCase()}
          color={getMetricDetails(modalData.metricType).color}
          gradientId={`aggregated-${modalData.metricType}`}
          valueFormatter={(value) => getMetricDetails(modalData.metricType).formatter(value)}
        />
      )}
    </div>
  );
};

export default AggregatedSparkCharts;

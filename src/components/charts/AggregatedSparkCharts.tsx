import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { getColorClasses } from "@/utils/anomalyColors";
import { TrendingDown, TrendingUp, Maximize } from "lucide-react";
import SparkChartModal from "@/components/SparkChartModal";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";
import { parseDateString, formatDateSortable } from "@/lib/utils";

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

// Helper function to get complete date range from data
const getCompleteDateRange = (data: any[]): Date[] => {
  const dates = data
    .map(row => row.DATE)
    .filter(date => date && date !== 'Totals')
    .map(dateStr => parseDateString(dateStr))
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

// Helper function to fill missing dates with zero values for aggregated data
const fillMissingDatesForAggregated = (timeSeriesData: any[], allDates: Date[]): any[] => {

  // If no data, return empty array
  if (timeSeriesData.length === 0 || allDates.length === 0) return timeSeriesData;

  // Create a map of existing data by date string - use the same format as aggregated data
  const dataByDate = new Map();
  timeSeriesData.forEach(item => {
    if (item.date) {
      dataByDate.set(item.date, item);
    }
  });


  // Find the actual range of dates that have data
  const datesWithData = timeSeriesData
    .map(item => parseDateString(item.date))
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime());

  if (datesWithData.length === 0) return timeSeriesData;

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
          REVENUE: 0,
          TRANSACTIONS: 0,
          SPEND: 0,
          CTR: 0,
          ROAS: 0
        });
      }
    }
  }


  return result;
};

/**
 * AggregatedSparkCharts - Displays aggregated metrics across all campaigns
 * Shows 6 metric cards in a 3x2 grid with sparkline charts
 */
export const AggregatedSparkCharts = ({ data }: AggregatedSparkChartsProps) => {
  const { showAggregatedSparkCharts, showDebugInfo } = useCampaignFilter();
  const [modalData, setModalData] = useState<ModalData>({
    isOpen: false,
    title: "",
    metricType: "impressions",
    data: []
  });

  console.log('AggregatedSparkCharts: Raw data received:', data.length, 'rows');
  console.log('AggregatedSparkCharts: Sample raw data:', data.slice(0, 3));

  // Get complete date range for filling gaps
  const completeDateRange = useMemo(() => getCompleteDateRange(data), [data]);

  // Group data by date for time series with optimization
  const timeSeriesData = useMemo(() => {
    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Starting time series aggregation...');
    }

    const dateGroups = new Map<string, any>();

    // Single pass aggregation
    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      if (!row?.DATE || row.DATE === 'Totals') {
        if (showDebugInfo && index < 5) {
          console.log('AggregatedSparkCharts: Skipping row:', row);
        }
        continue;
      }

      const dateStr = String(row.DATE).trim();
      let dateGroup = dateGroups.get(dateStr);

      if (!dateGroup) {
        dateGroup = {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          SPEND: 0
        };
        dateGroups.set(dateStr, dateGroup);
      }

      // Fast numeric conversion and accumulation
      dateGroup.IMPRESSIONS += +(row.IMPRESSIONS) || 0;
      dateGroup.CLICKS += +(row.CLICKS) || 0;
      dateGroup.REVENUE += +(row.REVENUE) || 0;
      dateGroup.TRANSACTIONS += +(row.TRANSACTIONS) || 0;
      dateGroup.SPEND += +(row.SPEND) || 0;
    }

    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Date groups created:', dateGroups.size);
    }

    // Convert Map to array and sort
    const rawData = Array.from(dateGroups.values()).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Raw aggregated data:', rawData.length, 'entries');
    }

    // Fill missing dates with zero values for continuous trend lines
    const filledData = fillMissingDatesForAggregated(rawData, completeDateRange);

    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Final filled data:', filledData.length, 'entries');
    }

    return filledData;
  }, [data, completeDateRange, showDebugInfo]);

  // Calculate totals with optimization
  const totals = useMemo(() => {
    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Calculating totals from timeSeriesData:', timeSeriesData.length, 'entries');
    }

    let impressions = 0;
    let clicks = 0;
    let revenue = 0;
    let transactions = 0;
    let spend = 0;

    // Fast accumulation without forEach
    for (let i = 0; i < timeSeriesData.length; i++) {
      const day = timeSeriesData[i];
      impressions += day.IMPRESSIONS;
      clicks += day.CLICKS;
      revenue += day.REVENUE;
      transactions += day.TRANSACTIONS;
      spend += day.SPEND;
    }

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    const calculatedTotals = { impressions, clicks, ctr, revenue, transactions, spend, roas };

    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Final totals:', calculatedTotals);
    }

    return calculatedTotals;
  }, [timeSeriesData, showDebugInfo]);

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

    const lastROAS = last.SPEND > 0 ? last.REVENUE / last.SPEND : 0;
    const secondLastROAS = secondLast.SPEND > 0 ? secondLast.REVENUE / secondLast.SPEND : 0;

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

  // Early return after all hooks are called
  if (!showAggregatedSparkCharts || !data || data.length === 0) {
    return null;
  }

  // Format functions
  const formatNumber = (value: number): string => value.toLocaleString();
  const formatRevenue = (value: number): string => `$${Math.round(value).toLocaleString()}`;
  const formatCTR = (value: number): string => `${value.toFixed(2)}%`;
  const formatROAS = (value: number): string => value.toFixed(2);

  const handleChartClick = (metricType: MetricType, title: string) => {
    // Transform the data to include calculated CTR and ROAS fields
    let transformedData = timeSeriesData;

    if (metricType === "ctr") {
      transformedData = timeSeriesData.map(d => ({
        ...d,
        CTR: d.IMPRESSIONS > 0 ? (d.CLICKS / d.IMPRESSIONS) * 100 : 0
      }));
    } else if (metricType === "roas") {
      transformedData = timeSeriesData.map(d => ({
        ...d,
        ROAS: d.SPEND > 0 ? d.REVENUE / d.SPEND : 0
      }));
    }

    console.log(`handleChartClick for ${metricType}:`, {
      metricType,
      originalDataLength: timeSeriesData.length,
      transformedDataLength: transformedData.length,
      sampleOriginal: timeSeriesData.slice(0, 2),
      sampleTransformed: transformedData.slice(0, 2)
    });

    setModalData({
      isOpen: true,
      title: `All Campaigns - ${title}`,
      metricType,
      data: transformedData
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
          title: "Attributed Sales",
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
                connectNulls={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };

  return (
    <div className="mb-2 animate-fade-in">
      {/* Updated to use two rows of three charts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          "Attributed Sales",
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
            return {...d, ROAS: d.SPEND > 0 ? d.REVENUE / d.SPEND : 0};
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

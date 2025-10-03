import { CampaignDataRow } from '@/types/campaign';
import { useMemo } from "react";
import {
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Eye, MousePointer, ShoppingCart, DollarSign, Percent, TrendingUp } from "lucide-react";
import { formatNumber, parseDateString } from "@/lib/utils";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { DateRange } from "react-day-picker";

interface DashboardSparkChartsProps {
  data: CampaignDataRow[];
  dateRange?: DateRange;
}

interface ChartData {
  date: string;
  rawDate: Date;
  impressions: number;
  clicks: number;
  transactions: number;
  revenue: number;
  ctr: number;
  roas: number;
}

const DashboardSparkCharts = ({ data, dateRange }: DashboardSparkChartsProps) => {
  const { isTestCampaign } = useCampaignFilter();

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Filter out test campaigns and aggregate by date
    const dateGroups = new Map<string, {
      date: string;
      rawDate: Date;
      impressions: number;
      clicks: number;
      transactions: number;
      revenue: number;
      spend: number;
    }>();

    data.forEach(row => {
      if (!row || !row.DATE || row.DATE === 'Totals') return;

      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return;

      const dateStr = String(row.DATE).trim();
      const parsedDate = parseDateString(dateStr);
      if (!parsedDate) return;

      const dateKey = parsedDate.toISOString().split('T')[0];

      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, {
          date: dateStr,
          rawDate: parsedDate,
          impressions: 0,
          clicks: 0,
          transactions: 0,
          revenue: 0,
          spend: 0,
        });
      }

      const group = dateGroups.get(dateKey)!;
      group.impressions += Number(row.IMPRESSIONS) || 0;
      group.clicks += Number(row.CLICKS) || 0;
      group.transactions += Number(row.TRANSACTIONS) || 0;
      group.revenue += Number(row.REVENUE) || 0;
      group.spend += Number(row.SPEND) || 0;
    });

    // Get all dates from data
    const dataArray = Array.from(dateGroups.values()).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    // If no dateRange filter, just return the data
    if (!dateRange?.from) {
      return dataArray.map(item => ({
        ...item,
        ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
        roas: item.spend > 0 ? item.revenue / item.spend : 0,
      }));
    }

    // Generate complete date range from filter
    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = dateRange.to ? new Date(dateRange.to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // Generate all dates in range
    const allDates: Date[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill all dates with data or zeros
    return allDates.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      const existingData = dateGroups.get(dateKey);

      if (existingData) {
        return {
          ...existingData,
          ctr: existingData.impressions > 0 ? (existingData.clicks / existingData.impressions) * 100 : 0,
          roas: existingData.spend > 0 ? existingData.revenue / existingData.spend : 0,
        };
      } else {
        // Fill missing dates with zeros to show data gaps visually
        return {
          date: dateKey,
          rawDate: date,
          impressions: 0,
          clicks: 0,
          transactions: 0,
          revenue: 0,
          spend: 0,
          ctr: 0,
          roas: 0,
        };
      }
    });
  }, [data, dateRange, isTestCampaign]);

  // Calculate totals
  const totals = useMemo(() => {
    return chartData.reduce((acc, item) => ({
      impressions: acc.impressions + item.impressions,
      clicks: acc.clicks + item.clicks,
      transactions: acc.transactions + item.transactions,
      revenue: acc.revenue + item.revenue,
      ctr: 0, // Will calculate separately
      roas: 0, // Will calculate separately
    }), { impressions: 0, clicks: 0, transactions: 0, revenue: 0, ctr: 0, roas: 0 });
  }, [chartData]);

  // Calculate overall CTR and ROAS
  const overallCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const overallROAS = chartData.reduce((sum, item) => sum + item.spend, 0) > 0
    ? totals.revenue / chartData.reduce((sum, item) => sum + item.spend, 0)
    : 0;

  if (!chartData || chartData.length === 0) {
    return null;
  }

  const chartConfig = [
    {
      title: "Impressions",
      value: totals.impressions,
      dataKey: "impressions",
      color: "#0EA5E9",
      icon: Eye,
      formatter: (value: number) => formatNumber(value, { abbreviate: false }),
    },
    {
      title: "Clicks",
      value: totals.clicks,
      dataKey: "clicks",
      color: "#8B5CF6",
      icon: MousePointer,
      formatter: (value: number) => formatNumber(value, { abbreviate: false }),
    },
    {
      title: "CTR",
      value: overallCTR,
      dataKey: "ctr",
      color: "#6366F1",
      icon: Percent,
      formatter: (value: number) => `${value.toFixed(2)}%`,
    },
    {
      title: "Transactions",
      value: totals.transactions,
      dataKey: "transactions",
      color: "#F97316",
      icon: ShoppingCart,
      formatter: (value: number) => formatNumber(value, { abbreviate: false }),
    },
    {
      title: "Revenue",
      value: totals.revenue,
      dataKey: "revenue",
      color: "#10B981",
      icon: DollarSign,
      formatter: (value: number) => `$${formatNumber(value, { abbreviate: false })}`,
    },
    {
      title: "ROAS",
      value: overallROAS,
      dataKey: "roas",
      color: "#F59E0B",
      icon: TrendingUp,
      formatter: (value: number) => `${value.toFixed(2)}x`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {chartConfig.map((config, index) => {
        const gradientId = `gradient-${config.dataKey}`;
        const IconComponent = config.icon;

        return (
          <Card key={config.dataKey} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  {config.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold mb-3">
                {config.formatter(config.value)}
              </div>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={config.color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey={config.dataKey}
                      stroke={config.color}
                      strokeWidth={2}
                      fill={`url(#${gradientId})`}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardSparkCharts;
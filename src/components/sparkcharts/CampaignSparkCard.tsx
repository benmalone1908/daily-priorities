import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { Card } from "@/components/ui/card";
import {
  Eye,
  MousePointer,
  ShoppingCart,
  DollarSign,
  ChevronRight,
  Percent,
  TrendingUp,
  Maximize
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { TimeSeriesDataPoint } from "@/types/campaign";

interface CampaignSparkCardProps {
  item: {
    name: string;
    timeSeriesData: TimeSeriesDataPoint[];
    totals: {
      impressions: number;
      clicks: number;
      transactions: number;
      revenue: number;
      spend: number;
    };
    avgCtr: number;
    avgRoas: number;
  };
  onChartClick: (itemName: string, metricType: string, timeSeriesData: TimeSeriesDataPoint[]) => void;
}

export const CampaignSparkCard = ({ item, onChartClick }: CampaignSparkCardProps) => {
  const getSafeId = (name: string, metric: string) => {
    return `${metric}-${name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')}`;
  };

  const impressionsId = getSafeId(item.name, 'impressions');
  const clicksId = getSafeId(item.name, 'clicks');
  const transactionsId = getSafeId(item.name, 'transactions');
  const revenueId = getSafeId(item.name, 'revenue');
  const ctrId = getSafeId(item.name, 'ctr');
  const roasId = getSafeId(item.name, 'roas');

  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium truncate" title={item.name}>
                {item.name}
              </h3>
              <div className="flex items-center mt-1">
                <p className="text-sm text-muted-foreground mr-3">
                  {item.timeSeriesData.length} days of data
                </p>
                <div className="flex items-center text-sm font-medium">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                  <span>Total Spend: ${formatNumber(item.totals.spend, { abbreviate: false })}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Metric Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 border-t pt-4">
            {/* Impressions */}
            <div className="flex items-center space-x-2">
              <div className="bg-sky-100 p-2 rounded-full">
                <Eye className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatNumber(item.totals.impressions, { abbreviate: false })}</p>
                <p className="text-xs text-muted-foreground">Impressions</p>
              </div>
            </div>

            {/* Clicks */}
            <div className="flex items-center space-x-2">
              <div className="bg-violet-100 p-2 rounded-full">
                <MousePointer className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatNumber(item.totals.clicks, { abbreviate: false })}</p>
                <p className="text-xs text-muted-foreground">Clicks</p>
              </div>
            </div>

            {/* CTR */}
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-100 p-2 rounded-full">
                <Percent className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatNumber(item.avgCtr, { decimals: 2, suffix: '%' })}</p>
                <p className="text-xs text-muted-foreground">CTR</p>
              </div>
            </div>

            {/* Transactions */}
            <div className="flex items-center space-x-2">
              <div className="bg-orange-100 p-2 rounded-full">
                <ShoppingCart className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatNumber(item.totals.transactions, { abbreviate: false })}</p>
                <p className="text-xs text-muted-foreground">Transactions</p>
              </div>
            </div>

            {/* Attributed Sales */}
            <div className="flex items-center space-x-2">
              <div className="bg-green-100 p-2 rounded-full">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">${formatNumber(item.totals.revenue, { abbreviate: false })}</p>
                <p className="text-xs text-muted-foreground">Attributed Sales</p>
              </div>
            </div>

            {/* ROAS */}
            <div className="flex items-center space-x-2">
              <div className="bg-amber-100 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatNumber(item.avgRoas, { decimals: 2, suffix: 'x' })}</p>
                <p className="text-xs text-muted-foreground">ROAS</p>
              </div>
            </div>
          </div>

          {/* Spark Charts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 h-24">
            {/* Impressions Chart */}
            <div
              className="hidden sm:block cursor-pointer relative group"
              onClick={() => onChartClick(item.name, "impressions", item.timeSeriesData)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize className="h-5 w-5 text-muted-foreground" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={item.timeSeriesData}>
                  <defs>
                    <linearGradient id={impressionsId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="impressions"
                    stroke="#0EA5E9"
                    strokeWidth={1.5}
                    fill={`url(#${impressionsId})`}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Clicks Chart */}
            <div
              className="hidden sm:block cursor-pointer relative group"
              onClick={() => onChartClick(item.name, "clicks", item.timeSeriesData)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize className="h-5 w-5 text-muted-foreground" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={item.timeSeriesData}>
                  <defs>
                    <linearGradient id={clicksId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#8B5CF6"
                    strokeWidth={1.5}
                    fill={`url(#${clicksId})`}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* CTR Chart */}
            <div
              className="hidden sm:block cursor-pointer relative group"
              onClick={() => onChartClick(item.name, "ctr", item.timeSeriesData)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize className="h-5 w-5 text-muted-foreground" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={item.timeSeriesData}>
                  <defs>
                    <linearGradient id={ctrId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="ctr"
                    stroke="#6366F1"
                    strokeWidth={1.5}
                    fill={`url(#${ctrId})`}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Transactions Chart */}
            <div
              className="hidden sm:block cursor-pointer relative group"
              onClick={() => onChartClick(item.name, "transactions", item.timeSeriesData)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize className="h-5 w-5 text-muted-foreground" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={item.timeSeriesData}>
                  <defs>
                    <linearGradient id={transactionsId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="transactions"
                    stroke="#F97316"
                    strokeWidth={1.5}
                    fill={`url(#${transactionsId})`}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue Chart */}
            <div
              className="hidden sm:block cursor-pointer relative group"
              onClick={() => onChartClick(item.name, "revenue", item.timeSeriesData)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize className="h-5 w-5 text-muted-foreground" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={item.timeSeriesData}>
                  <defs>
                    <linearGradient id={revenueId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    fill={`url(#${revenueId})`}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ROAS Chart */}
            <div
              className="hidden sm:block cursor-pointer relative group"
              onClick={() => onChartClick(item.name, "roas", item.timeSeriesData)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize className="h-5 w-5 text-muted-foreground" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={item.timeSeriesData}>
                  <defs>
                    <linearGradient id={roasId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="roas"
                    stroke="#F59E0B"
                    strokeWidth={1.5}
                    fill={`url(#${roasId})`}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};


import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Card } from "@/components/ui/card";
import { Eye, MousePointer, ShoppingCart, DollarSign, ChevronRight, Percent, TrendingUp, Maximize } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { getSafeId, MetricType } from "@/utils/chartUtils";

interface SparkChartItemProps {
  item: {
    name: string;
    timeSeriesData: any[];
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
  onChartClick: (itemName: string, metricType: MetricType, timeSeriesData: any[]) => void;
}

const SparkChartItem = ({ item, onChartClick }: SparkChartItemProps) => {
  const impressionsId = useMemo(() => `impressions-${getSafeId(item.name)}`, [item.name]);
  const clicksId = useMemo(() => `clicks-${getSafeId(item.name)}`, [item.name]);
  const transactionsId = useMemo(() => `transactions-${getSafeId(item.name)}`, [item.name]);
  const revenueId = useMemo(() => `revenue-${getSafeId(item.name)}`, [item.name]);
  const ctrId = useMemo(() => `ctr-${getSafeId(item.name)}`, [item.name]);
  const roasId = useMemo(() => `roas-${getSafeId(item.name)}`, [item.name]);

  return (
    <Card key={item.name} className="overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
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

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 border-t pt-4">
            <MetricSummary 
              icon={<Eye className="h-4 w-4 text-sky-500" />} 
              value={item.totals.impressions} 
              label="Impressions" 
              bgColor="bg-sky-100" 
            />

            <MetricSummary 
              icon={<MousePointer className="h-4 w-4 text-violet-500" />} 
              value={item.totals.clicks} 
              label="Clicks" 
              bgColor="bg-violet-100" 
            />

            <MetricSummary 
              icon={<Percent className="h-4 w-4 text-indigo-500" />} 
              value={item.avgCtr} 
              label="CTR" 
              bgColor="bg-indigo-100" 
              format={(value) => formatNumber(value, { decimals: 2, suffix: '%' })}
            />

            <MetricSummary 
              icon={<ShoppingCart className="h-4 w-4 text-orange-500" />} 
              value={item.totals.transactions} 
              label="Transactions" 
              bgColor="bg-orange-100" 
            />

            <MetricSummary 
              icon={<DollarSign className="h-4 w-4 text-green-500" />} 
              value={item.totals.revenue} 
              label="Revenue" 
              bgColor="bg-green-100" 
              format={(value) => `$${formatNumber(value, { abbreviate: false })}`}
            />

            <MetricSummary 
              icon={<TrendingUp className="h-4 w-4 text-amber-500" />} 
              value={item.avgRoas} 
              label="ROAS" 
              bgColor="bg-amber-100" 
              format={(value) => formatNumber(value, { decimals: 2, suffix: 'x' })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 h-24">
            <SparkChart 
              data={item.timeSeriesData} 
              dataKey="impressions" 
              color="#0EA5E9" 
              gradientId={impressionsId} 
              onClick={() => onChartClick(item.name, "impressions", item.timeSeriesData)} 
            />

            <SparkChart 
              data={item.timeSeriesData} 
              dataKey="clicks" 
              color="#8B5CF6" 
              gradientId={clicksId} 
              onClick={() => onChartClick(item.name, "clicks", item.timeSeriesData)} 
            />

            <SparkChart 
              data={item.timeSeriesData} 
              dataKey="ctr" 
              color="#6366F1" 
              gradientId={ctrId} 
              onClick={() => onChartClick(item.name, "ctr", item.timeSeriesData)} 
            />

            <SparkChart 
              data={item.timeSeriesData} 
              dataKey="transactions" 
              color="#F97316" 
              gradientId={transactionsId} 
              onClick={() => onChartClick(item.name, "transactions", item.timeSeriesData)} 
            />

            <SparkChart 
              data={item.timeSeriesData} 
              dataKey="revenue" 
              color="#10B981" 
              gradientId={revenueId} 
              onClick={() => onChartClick(item.name, "revenue", item.timeSeriesData)} 
            />

            <SparkChart 
              data={item.timeSeriesData} 
              dataKey="roas" 
              color="#F59E0B" 
              gradientId={roasId} 
              onClick={() => onChartClick(item.name, "roas", item.timeSeriesData)} 
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

interface MetricSummaryProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  bgColor: string;
  format?: (value: number) => string;
}

const MetricSummary = ({ 
  icon, 
  value, 
  label, 
  bgColor, 
  format = (value) => formatNumber(value, { abbreviate: false }) 
}: MetricSummaryProps) => (
  <div className="flex items-center space-x-2">
    <div className={`${bgColor} p-2 rounded-full`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium">{format(value)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

interface SparkChartProps {
  data: any[];
  dataKey: string;
  color: string;
  gradientId: string;
  onClick: () => void;
}

const SparkChart = ({ data, dataKey, color, gradientId, onClick }: SparkChartProps) => (
  <div className="hidden sm:block cursor-pointer relative group" onClick={onClick}>
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      <Maximize className="h-5 w-5 text-muted-foreground" />
    </div>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export default SparkChartItem;

import { CampaignDataRow } from '@/types/campaign';
import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { DateRange } from 'react-day-picker';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SparkChartComponentProps {
  data: CampaignDataRow[];
  metric: string;
  dateRange: DateRange;
  title: string;
  simplified?: boolean;
}

const SparkChartComponent: React.FC<SparkChartComponentProps> = ({ data,
  metric,
  dateRange,
  title,
  simplified = false
}) => {
  // Process data for the specific metric
  const processedData = useMemo(() => {
    // Generate complete date range from filter
    if (!dateRange.from) return [];

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

    // Group data by date
    const dateGroups = new Map<string, {
      date: string;
      IMPRESSIONS: number;
      CLICKS: number;
      REVENUE: number;
      TRANSACTIONS: number;
      SPEND: number;
    }>();

    data.forEach(row => {
      if (!row.DATE || row.DATE === 'Totals') return;

      const dateStr = String(row.DATE).trim();
      if (!dateGroups.has(dateStr)) {
        dateGroups.set(dateStr, {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          SPEND: 0
        });
      }

      const group = dateGroups.get(dateStr)!;
      group.IMPRESSIONS += +(row.IMPRESSIONS) || 0;
      group.CLICKS += +(row.CLICKS) || 0;
      group.REVENUE += +(row.REVENUE) || 0;
      group.TRANSACTIONS += +(row.TRANSACTIONS) || 0;
      group.SPEND += +(row.SPEND) || 0;
    });

    // Fill all dates with data or zeros
    return allDates.map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const existingData = dateGroups.get(dateStr);

      if (existingData) {
        return {
          ...existingData,
          CTR: existingData.IMPRESSIONS > 0 ? (existingData.CLICKS / existingData.IMPRESSIONS) * 100 : 0,
          ROAS: existingData.SPEND > 0 ? existingData.REVENUE / existingData.SPEND : 0
        };
      } else {
        // Fill missing dates with zeros to show data gaps visually
        return {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          SPEND: 0,
          CTR: 0,
          ROAS: 0
        };
      }
    });
  }, [data, dateRange]);

  // Calculate totals and trends
  const stats = useMemo(() => {
    if (processedData.length === 0) {
      return { total: 0, trend: 0, color: '#4ade80', formatter: (v: number) => v.toString() };
    }

    let total = 0;
    let trend = 0;
    let color = '#4ade80';
    let formatter = (v: number) => v.toLocaleString();

    switch (metric) {
      case 'impressions':
        total = processedData.reduce((sum, d) => sum + d.IMPRESSIONS, 0);
        if (processedData.length >= 2) {
          const last = processedData[processedData.length - 1].IMPRESSIONS;
          const prev = processedData[processedData.length - 2].IMPRESSIONS;
          trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;
        }
        color = '#4ade80';
        break;

      case 'clicks':
        total = processedData.reduce((sum, d) => sum + d.CLICKS, 0);
        if (processedData.length >= 2) {
          const last = processedData[processedData.length - 1].CLICKS;
          const prev = processedData[processedData.length - 2].CLICKS;
          trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;
        }
        color = '#f59e0b';
        break;

      case 'ctr':
        total = processedData.length > 0 ? 
          processedData.reduce((sum, d) => sum + d.CTR, 0) / processedData.length : 0;
        if (processedData.length >= 2) {
          const last = processedData[processedData.length - 1].CTR;
          const prev = processedData[processedData.length - 2].CTR;
          trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;
        }
        color = '#0ea5e9';
        formatter = (v: number) => `${v.toFixed(2)}%`;
        break;

      case 'transactions':
        total = processedData.reduce((sum, d) => sum + d.TRANSACTIONS, 0);
        if (processedData.length >= 2) {
          const last = processedData[processedData.length - 1].TRANSACTIONS;
          const prev = processedData[processedData.length - 2].TRANSACTIONS;
          trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;
        }
        color = '#8b5cf6';
        break;

      case 'revenue':
        total = processedData.reduce((sum, d) => sum + d.REVENUE, 0);
        if (processedData.length >= 2) {
          const last = processedData[processedData.length - 1].REVENUE;
          const prev = processedData[processedData.length - 2].REVENUE;
          trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;
        }
        color = '#ef4444';
        formatter = (v: number) => `$${Math.round(v).toLocaleString()}`;
        break;

      case 'roas': {
        const totalRevenue = processedData.reduce((sum, d) => sum + d.REVENUE, 0);
        const totalSpend = processedData.reduce((sum, d) => sum + d.SPEND, 0);
        total = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        if (processedData.length >= 2) {
          const last = processedData[processedData.length - 1].ROAS;
          const prev = processedData[processedData.length - 2].ROAS;
          trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;
        }
        color = '#d946ef';
        formatter = (v: number) => v.toFixed(2);
        break;
      }
    }

    return { total, trend, color, formatter };
  }, [processedData, metric]);

  const dataKey = metric.toUpperCase();
  const gradientId = `gradient-${metric}-${Math.random().toString(36).substr(2, 9)}`;

  const getMetricDisplayName = (metric: string) => {
    const upperMetric = metric.toUpperCase();
    if (upperMetric === 'CTR' || upperMetric === 'ROAS') {
      return upperMetric;
    }
    return metric.charAt(0).toUpperCase() + metric.slice(1);
  };

  if (simplified) {
    return (
      <Card className="p-4 pb-2">
        <div className="mb-3">
          <h4 className="text-sm font-semibold">{getMetricDisplayName(metric)}</h4>
          <p className="text-xs text-muted-foreground">
            {dateRange.from?.toLocaleDateString()} - {dateRange.to?.toLocaleDateString()}
          </p>
        </div>

        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData} margin={{ top: 2, right: 5, left: 5, bottom: -15 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stats.color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={stats.color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <YAxis hide />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={stats.color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          {dateRange.from?.toLocaleDateString()} - {dateRange.to?.toLocaleDateString()}
        </p>
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-sm font-medium">{getMetricDisplayName(metric)}</h4>
          <div className="text-2xl font-bold mt-1">
            {stats.formatter(stats.total)}
          </div>
        </div>
        
        <div className="flex items-center text-sm">
          {stats.trend > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
          )}
          <span className={stats.trend > 0 ? "text-green-600" : "text-red-600"}>
            {Math.abs(stats.trend).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={processedData}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stats.color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={stats.color} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={false}
            />
            <YAxis hide />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={stats.color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SparkChartComponent;
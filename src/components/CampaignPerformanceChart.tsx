import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartModeSelector } from './ChartModeSelector';
import { DailyTotalsTable } from './DailyTotalsTable';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatNumber } from '@/lib/utils';
import type { DeliveryDataRow } from '@/types/dashboard';

interface ChartDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  transactions: number;
  revenue: number;
  formattedDate?: string;
}

interface CampaignPerformanceChartProps {
  data: DeliveryDataRow[];
  campaignName: string;
}

export const CampaignPerformanceChart: React.FC<CampaignPerformanceChartProps> = ({
  data,
  campaignName
}) => {
  const [chartMode, setChartMode] = useState<'display' | 'attribution' | 'custom'>('display');

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group data by date and sum metrics for this specific campaign
    const groupedByDate = data.reduce((acc, row) => {
      const date = row.DATE;
      if (!date || date === 'Totals') return acc;

      if (!acc[date]) {
        acc[date] = {
          date,
          impressions: 0,
          clicks: 0,
          transactions: 0,
          revenue: 0,
        };
      }

      // Add up the metrics for this date
      acc[date].impressions += parseFloat(String(row.IMPRESSIONS)) || 0;
      acc[date].clicks += parseFloat(String(row.CLICKS || 0)) || 0;
      acc[date].transactions += parseFloat(String(row.TRANSACTIONS || 0)) || 0;
      acc[date].revenue += parseFloat(String(row.REVENUE || 0)) || 0;

      return acc;
    }, {} as Record<string, ChartDataPoint>);

    // Convert to array and sort by date (oldest first for chart)
    return Object.values(groupedByDate).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    }).map((item) => ({
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric'
      })
    }));
  }, [data]);

  const getChartConfig = () => {
    switch (chartMode) {
      case 'display':
        return {
          primaryMetric: 'impressions',
          secondaryMetric: 'clicks',
          primaryColor: '#0EA5E9',
          secondaryColor: '#8B5CF6',
          primaryLabel: 'Impressions',
          secondaryLabel: 'Clicks'
        };
      case 'attribution':
        return {
          primaryMetric: 'revenue',
          secondaryMetric: 'transactions',
          primaryColor: '#10B981',
          secondaryColor: '#F59E0B',
          primaryLabel: 'Revenue',
          secondaryLabel: 'Orders'
        };
      case 'custom':
        return {
          primaryMetric: 'impressions',
          secondaryMetric: 'revenue',
          primaryColor: '#0EA5E9',
          secondaryColor: '#10B981',
          primaryLabel: 'Impressions',
          secondaryLabel: 'Revenue'
        };
      default:
        return {
          primaryMetric: 'impressions',
          secondaryMetric: 'clicks',
          primaryColor: '#0EA5E9',
          secondaryColor: '#8B5CF6',
          primaryLabel: 'Impressions',
          secondaryLabel: 'Clicks'
        };
    }
  };

  const config = getChartConfig();

  interface TooltipPayload {
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }

  interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') ? '$' : ''}{formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0 || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campaign Performance</CardTitle>
            <ChartModeSelector mode={chartMode} onModeChange={setChartMode} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No performance data available for this campaign
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Mode Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Campaign Performance</h3>
        <ChartModeSelector mode={chartMode} onModeChange={setChartMode} />
      </div>

      {/* Chart and Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {config.primaryLabel} & {config.secondaryLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={config.primaryColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={config.primaryColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="formattedDate"
                      className="text-xs"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      className="text-xs"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatNumber(value, { abbreviate: true })}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      className="text-xs"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatNumber(value, { abbreviate: true })}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey={config.primaryMetric}
                      stroke={config.primaryColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#primaryGradient)"
                      name={config.primaryLabel}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={config.secondaryMetric}
                      stroke={config.secondaryColor}
                      strokeWidth={2}
                      dot={{ fill: config.secondaryColor, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      name={config.secondaryLabel}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Totals Table */}
        <div className="lg:col-span-1">
          <DailyTotalsTable data={data} chartMode={chartMode} />
        </div>
      </div>
    </div>
  );
};
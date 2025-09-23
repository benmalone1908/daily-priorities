import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

interface DailyTotalsTableProps {
  data: any[];
  chartMode: 'display' | 'attribution' | 'custom';
}

export const DailyTotalsTable: React.FC<DailyTotalsTableProps> = ({ data, chartMode }) => {
  const dailyTotals = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group data by date and calculate totals
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
      acc[date].impressions += parseFloat(row.IMPRESSIONS) || 0;
      acc[date].clicks += parseFloat(row.CLICKS) || 0;
      acc[date].transactions += parseFloat(row.TRANSACTIONS) || 0;
      acc[date].revenue += parseFloat(row.REVENUE) || 0;

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by date (most recent first)
    return Object.values(groupedByDate).sort((a: any, b: any) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [data]);

  const getColumns = () => {
    switch (chartMode) {
      case 'display':
        return [
          { key: 'impressions', label: 'Impressions', format: (val: number) => val.toLocaleString() },
          { key: 'clicks', label: 'Clicks', format: (val: number) => val.toLocaleString() }
        ];
      case 'attribution':
        return [
          { key: 'transactions', label: 'Orders', format: (val: number) => val.toLocaleString() },
          { key: 'revenue', label: 'Revenue', format: (val: number) => `$${val.toLocaleString()}` }
        ];
      case 'custom':
        return [
          { key: 'impressions', label: 'Impressions', format: (val: number) => val.toLocaleString() },
          { key: 'clicks', label: 'Clicks', format: (val: number) => val.toLocaleString() },
          { key: 'transactions', label: 'Orders', format: (val: number) => val.toLocaleString() },
          { key: 'revenue', label: 'Revenue', format: (val: number) => `$${val.toLocaleString()}` }
        ];
      default:
        return [];
    }
  };

  const columns = getColumns();

  if (dailyTotals.length === 0) {
    return (
      <Card className="h-full">
        <CardContent>
          <div className="text-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-0">
        <div className="h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground w-1/3">Date</th>
                {columns.map(col => (
                  <th key={col.key} className="text-right p-3 font-medium text-muted-foreground w-1/3">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyTotals.map((row, index) => (
                <tr key={row.date} className={index % 2 === 0 ? 'bg-muted/25' : 'bg-background'}>
                  <td className="p-3 font-medium w-1/3">
                    {new Date(row.date).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: '2-digit'
                    })}
                  </td>
                  {columns.map(col => (
                    <td key={col.key} className="p-3 text-right font-medium w-1/3">
                      {col.format(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
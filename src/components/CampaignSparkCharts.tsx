
import { useMemo } from "react";
import { 
  LineChart, 
  Line, 
  ResponsiveContainer,
  Tooltip
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, MousePointer, ShoppingCart, DollarSign } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface CampaignSparkChartsProps {
  data: any[];
}

const CampaignSparkCharts = ({ data }: CampaignSparkChartsProps) => {
  // Process data to get campaigns and their metrics over time
  const campaignData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Extract unique campaigns
    const campaigns = Array.from(new Set(data.map(row => row["CAMPAIGN ORDER NAME"]))).sort();
    
    // Group data by campaign and date
    const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    
    return campaigns.map(campaign => {
      // Filter data for this campaign
      const campaignRows = data.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);
      
      // Sort by date
      campaignRows.sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
      
      // Extract metrics per date
      const timeSeriesData = campaignRows.map(row => ({
        date: dateFormat.format(new Date(row.DATE)),
        rawDate: new Date(row.DATE),
        impressions: Number(row.IMPRESSIONS) || 0,
        clicks: Number(row.CLICKS) || 0,
        transactions: Number(row.TRANSACTIONS) || 0,
        revenue: Number(row.REVENUE) || 0,
      }));

      // Calculate totals for this campaign
      const totals = {
        impressions: timeSeriesData.reduce((sum, row) => sum + row.impressions, 0),
        clicks: timeSeriesData.reduce((sum, row) => sum + row.clicks, 0),
        transactions: timeSeriesData.reduce((sum, row) => sum + row.transactions, 0),
        revenue: timeSeriesData.reduce((sum, row) => sum + row.revenue, 0),
      };

      return {
        name: campaign,
        timeSeriesData,
        totals
      };
    });
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {campaignData.map((campaign) => (
        <Card key={campaign.name} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base truncate" title={campaign.name}>
              {campaign.name}
            </CardTitle>
            <CardDescription>
              {campaign.timeSeriesData.length} days of data
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Impressions */}
              <div className="space-y-1">
                <div className="flex items-center text-sm">
                  <Eye className="mr-1 text-sky-500" size={14} />
                  <span className="text-muted-foreground">Impressions</span>
                </div>
                <div className="h-1"></div>
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={campaign.timeSeriesData}>
                    <Tooltip 
                      formatter={(value: number) => [formatNumber(value), 'Impressions']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="impressions"
                      stroke="#0EA5E9"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-sm font-medium">{formatNumber(campaign.totals.impressions)}</p>
              </div>

              {/* Clicks */}
              <div className="space-y-1">
                <div className="flex items-center text-sm">
                  <MousePointer className="mr-1 text-violet-500" size={14} />
                  <span className="text-muted-foreground">Clicks</span>
                </div>
                <div className="h-1"></div>
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={campaign.timeSeriesData}>
                    <Tooltip 
                      formatter={(value: number) => [formatNumber(value), 'Clicks']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="#8B5CF6"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-sm font-medium">{formatNumber(campaign.totals.clicks)}</p>
              </div>

              {/* Transactions */}
              <div className="space-y-1">
                <div className="flex items-center text-sm">
                  <ShoppingCart className="mr-1 text-orange-500" size={14} />
                  <span className="text-muted-foreground">Transactions</span>
                </div>
                <div className="h-1"></div>
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={campaign.timeSeriesData}>
                    <Tooltip 
                      formatter={(value: number) => [formatNumber(value), 'Transactions']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      stroke="#F97316"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-sm font-medium">{formatNumber(campaign.totals.transactions)}</p>
              </div>

              {/* Revenue */}
              <div className="space-y-1">
                <div className="flex items-center text-sm">
                  <DollarSign className="mr-1 text-green-500" size={14} />
                  <span className="text-muted-foreground">Revenue</span>
                </div>
                <div className="h-1"></div>
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={campaign.timeSeriesData}>
                    <Tooltip 
                      formatter={(value: number) => [`$${formatNumber(value)}`, 'Revenue']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-sm font-medium">${formatNumber(campaign.totals.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CampaignSparkCharts;

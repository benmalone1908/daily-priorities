
import { useMemo } from "react";
import { 
  LineChart, 
  Line, 
  ResponsiveContainer,
  Tooltip,
  Area
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, MousePointer, ShoppingCart, DollarSign, ChevronRight } from "lucide-react";
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
    <div className="space-y-4">
      {campaignData.map((campaign) => (
        <Card key={campaign.name} className="overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium truncate" title={campaign.name}>
                    {campaign.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {campaign.timeSeriesData.length} days of data
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-4">
                {/* Impressions */}
                <div className="flex items-center space-x-2">
                  <div className="bg-sky-100 p-2 rounded-full">
                    <Eye className="h-4 w-4 text-sky-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{formatNumber(campaign.totals.impressions)}</p>
                    <p className="text-xs text-muted-foreground">Impressions</p>
                  </div>
                </div>

                {/* Clicks */}
                <div className="flex items-center space-x-2">
                  <div className="bg-violet-100 p-2 rounded-full">
                    <MousePointer className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{formatNumber(campaign.totals.clicks)}</p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                </div>

                {/* Transactions */}
                <div className="flex items-center space-x-2">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <ShoppingCart className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{formatNumber(campaign.totals.transactions)}</p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </div>
                </div>

                {/* Revenue */}
                <div className="flex items-center space-x-2">
                  <div className="bg-green-100 p-2 rounded-full">
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">${formatNumber(campaign.totals.revenue)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 h-24">
                {/* Impressions chart */}
                <div className="hidden sm:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={campaign.timeSeriesData}>
                      <Tooltip 
                        formatter={(value: number) => [formatNumber(value), 'Impressions']}
                        labelFormatter={(label) => `${label}`}
                      />
                      <defs>
                        <linearGradient id={`impressionsGradient-${campaign.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="impressions"
                        stroke="#0EA5E9"
                        strokeWidth={1.5}
                        fill={`url(#impressionsGradient-${campaign.name})`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Clicks chart */}
                <div className="hidden sm:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={campaign.timeSeriesData}>
                      <Tooltip 
                        formatter={(value: number) => [formatNumber(value), 'Clicks']}
                        labelFormatter={(label) => `${label}`}
                      />
                      <defs>
                        <linearGradient id={`clicksGradient-${campaign.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#8B5CF6"
                        strokeWidth={1.5}
                        fill={`url(#clicksGradient-${campaign.name})`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Transactions chart */}
                <div className="hidden sm:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={campaign.timeSeriesData}>
                      <Tooltip 
                        formatter={(value: number) => [formatNumber(value), 'Transactions']}
                        labelFormatter={(label) => `${label}`}
                      />
                      <defs>
                        <linearGradient id={`transactionsGradient-${campaign.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="transactions"
                        stroke="#F97316"
                        strokeWidth={1.5}
                        fill={`url(#transactionsGradient-${campaign.name})`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue chart */}
                <div className="hidden sm:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={campaign.timeSeriesData}>
                      <Tooltip 
                        formatter={(value: number) => [`$${formatNumber(value)}`, 'Revenue']}
                        labelFormatter={(label) => `${label}`}
                      />
                      <defs>
                        <linearGradient id={`revenueGradient-${campaign.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10B981"
                        strokeWidth={1.5}
                        fill={`url(#revenueGradient-${campaign.name})`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CampaignSparkCharts;

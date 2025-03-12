import { useMemo } from "react";
import { 
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, MousePointer, ShoppingCart, DollarSign, ChevronRight, Percent, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface CampaignSparkChartsProps {
  data: any[];
  dateRange?: DateRange;
}

const CampaignSparkCharts = ({ data, dateRange }: CampaignSparkChartsProps) => {
  // Process data to get campaigns and their metrics over time
  const campaignData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Filter data by date range if provided
    let filteredData = data;
    if (dateRange?.from) {
      filteredData = data.filter(row => {
        const rowDate = new Date(row.DATE);
        if (isNaN(rowDate.getTime())) return false;
        
        // If only from date is selected
        if (dateRange.from && !dateRange.to) {
          const fromDate = new Date(dateRange.from);
          return rowDate >= fromDate;
        }
        
        // If both from and to dates are selected
        if (dateRange.from && dateRange.to) {
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          // Set toDate to end of day for inclusive filtering
          toDate.setHours(23, 59, 59, 999);
          return rowDate >= fromDate && rowDate <= toDate;
        }
        
        return true;
      });
    }

    // Extract unique campaigns
    const campaigns = Array.from(new Set(filteredData.map(row => row["CAMPAIGN ORDER NAME"]))).sort();
    
    // Group data by campaign and date
    const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    
    return campaigns.map(campaign => {
      // Filter data for this campaign
      const campaignRows = filteredData.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);
      
      // Sort by date
      campaignRows.sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
      
      // Extract metrics per date
      const timeSeriesData = campaignRows.map(row => {
        // Get basic metrics
        const impressions = Number(row.IMPRESSIONS) || 0;
        const clicks = Number(row.CLICKS) || 0;
        const transactions = Number(row.TRANSACTIONS) || 0;
        const revenue = Number(row.REVENUE) || 0;
        
        // Calculate spend using $15 CPM
        const spend = (impressions / 1000) * 15;
        
        // Calculate CTR and ROAS
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const roas = spend > 0 ? revenue / spend : 0;
        
        return {
          date: dateFormat.format(new Date(row.DATE)),
          rawDate: new Date(row.DATE),
          impressions,
          clicks,
          transactions,
          revenue,
          spend,
          ctr,
          roas
        };
      });

      // Calculate totals for this campaign
      const totals = {
        impressions: timeSeriesData.reduce((sum, row) => sum + row.impressions, 0),
        clicks: timeSeriesData.reduce((sum, row) => sum + row.clicks, 0),
        transactions: timeSeriesData.reduce((sum, row) => sum + row.transactions, 0),
        revenue: timeSeriesData.reduce((sum, row) => sum + row.revenue, 0),
        spend: timeSeriesData.reduce((sum, row) => sum + row.spend, 0),
      };
      
      // Calculate average CTR and ROAS (not sum)
      const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const avgRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

      return {
        name: campaign,
        timeSeriesData,
        totals,
        avgCtr,
        avgRoas
      };
    });
  }, [data, dateRange]);

  // Create a safe ID from campaign name
  const getSafeId = (campaignName: string) => {
    // Replace all non-alphanumeric characters with hyphens and ensure uniqueness
    return `gradient-${campaignName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')}`;
  };

  if (!data || data.length === 0) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      {campaignData.map((campaign) => {
        // Create safe IDs for each gradient
        const impressionsId = `impressions-${getSafeId(campaign.name)}`;
        const clicksId = `clicks-${getSafeId(campaign.name)}`;
        const transactionsId = `transactions-${getSafeId(campaign.name)}`;
        const revenueId = `revenue-${getSafeId(campaign.name)}`;
        const ctrId = `ctr-${getSafeId(campaign.name)}`;
        const roasId = `roas-${getSafeId(campaign.name)}`;
        
        return (
          <Card key={campaign.name} className="overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium truncate" title={campaign.name}>
                      {campaign.name}
                    </h3>
                    <div className="flex items-center mt-1">
                      <p className="text-sm text-muted-foreground mr-3">
                        {campaign.timeSeriesData.length} days of data
                      </p>
                      <div className="flex items-center text-sm font-medium">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                        <span>Total Spend: ${formatNumber(campaign.totals.spend, { abbreviate: false })}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 border-t pt-4">
                  {/* Impressions */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-sky-100 p-2 rounded-full">
                      <Eye className="h-4 w-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(campaign.totals.impressions, { abbreviate: false })}</p>
                      <p className="text-xs text-muted-foreground">Impressions</p>
                    </div>
                  </div>

                  {/* Clicks */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-violet-100 p-2 rounded-full">
                      <MousePointer className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(campaign.totals.clicks, { abbreviate: false })}</p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                  </div>

                  {/* CTR */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-indigo-100 p-2 rounded-full">
                      <Percent className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(campaign.avgCtr, { decimals: 2, suffix: '%' })}</p>
                      <p className="text-xs text-muted-foreground">CTR</p>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <ShoppingCart className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(campaign.totals.transactions, { abbreviate: false })}</p>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-green-100 p-2 rounded-full">
                      <DollarSign className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">${formatNumber(campaign.totals.revenue, { abbreviate: false })}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>

                  {/* ROAS */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-amber-100 p-2 rounded-full">
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(campaign.avgRoas, { decimals: 2, suffix: 'x' })}</p>
                      <p className="text-xs text-muted-foreground">ROAS</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 h-24">
                  {/* Impressions chart */}
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={campaign.timeSeriesData}>
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value, { abbreviate: false }), 'Impressions']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <defs>
                          <linearGradient id={impressionsId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
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
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Clicks chart */}
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={campaign.timeSeriesData}>
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value, { abbreviate: false }), 'Clicks']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <defs>
                          <linearGradient id={clicksId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
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
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* CTR chart */}
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={campaign.timeSeriesData}>
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value, { decimals: 2, suffix: '%' }), 'CTR']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <defs>
                          <linearGradient id={ctrId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
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
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Transactions chart */}
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={campaign.timeSeriesData}>
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value, { abbreviate: false }), 'Transactions']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <defs>
                          <linearGradient id={transactionsId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
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
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Revenue chart */}
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={campaign.timeSeriesData}>
                        <Tooltip 
                          formatter={(value: number) => ['$' + formatNumber(value, { abbreviate: false }), 'Revenue']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <defs>
                          <linearGradient id={revenueId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
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
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ROAS chart */}
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={campaign.timeSeriesData}>
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value, { decimals: 2, suffix: 'x' }), 'ROAS']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <defs>
                          <linearGradient id={roasId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
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
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CampaignSparkCharts;

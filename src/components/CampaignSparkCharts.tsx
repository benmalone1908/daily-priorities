
import { useMemo, useState, useEffect } from "react";
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
import { Eye, MousePointer, ShoppingCart, DollarSign, ChevronRight, Percent, TrendingUp, FilterIcon, User, Flag } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { MultiSelect } from "./MultiSelect";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CampaignSparkChartsProps {
  data: any[];
  dateRange?: DateRange;
}

type ViewMode = "advertiser" | "campaign";

const CampaignSparkCharts = ({ data, dateRange }: CampaignSparkChartsProps) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("campaign");
  
  const advertiserOptions = useMemo(() => {
    const advertisers = new Set<string>();
    
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      if (advertiser) advertisers.add(advertiser);
    });
    
    return Array.from(advertisers)
      .sort((a, b) => a.localeCompare(b))
      .map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
  }, [data]);

  const campaignOptions = useMemo(() => {
    let filteredData = data;
    
    if (selectedAdvertisers.length > 0) {
      filteredData = data.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const match = campaignName.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selectedAdvertisers.includes(advertiser);
      });
    }
    
    const uniqueCampaigns = Array.from(new Set(filteredData.map(row => row["CAMPAIGN ORDER NAME"])));
    return uniqueCampaigns
      .sort((a, b) => a.localeCompare(b))
      .map(campaign => ({
        value: campaign,
        label: campaign
      }));
  }, [data, selectedAdvertisers]);

  useEffect(() => {
    if (selectedAdvertisers.length > 0) {
      setSelectedCampaigns(prev => {
        return prev.filter(campaign => {
          const campaignRows = data.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);
          if (campaignRows.length === 0) return false;
          
          const campaignName = campaignRows[0]["CAMPAIGN ORDER NAME"] || "";
          const match = campaignName.match(/SM:\s+([^-]+)/);
          const advertiser = match ? match[1].trim() : "";
          return selectedAdvertisers.includes(advertiser);
        });
      });
    }
  }, [selectedAdvertisers, data]);

  const filteredData = useMemo(() => {
    let result = data;
    
    if (selectedAdvertisers.length > 0) {
      result = result.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const match = campaignName.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selectedAdvertisers.includes(advertiser);
      });
    }
    
    if (selectedCampaigns.length > 0) {
      result = result.filter(row => selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }
    
    return result;
  }, [data, selectedCampaigns, selectedAdvertisers]);

  // Group data by advertiser or campaign based on view mode
  const groupedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    let filteredDataByDate = filteredData;
    if (dateRange?.from) {
      filteredDataByDate = filteredData.filter(row => {
        const rowDate = new Date(row.DATE);
        if (isNaN(rowDate.getTime())) return false;
        
        if (dateRange.from && !dateRange.to) {
          const fromDate = new Date(dateRange.from);
          return rowDate >= fromDate;
        }
        
        if (dateRange.from && dateRange.to) {
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return rowDate >= fromDate && rowDate <= toDate;
        }
        
        return true;
      });
    }

    if (viewMode === "advertiser") {
      // Group by advertiser
      const advertisers = Array.from(new Set(filteredDataByDate.map(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const match = campaignName.match(/SM:\s+([^-]+)/);
        return match ? match[1].trim() : "Unknown";
      }))).filter(advertiser => advertiser !== "Unknown").sort();

      return advertisers.map(advertiser => {
        const advertiserRows = filteredDataByDate.filter(row => {
          const campaignName = row["CAMPAIGN ORDER NAME"] || "";
          const match = campaignName.match(/SM:\s+([^-]+)/);
          const rowAdvertiser = match ? match[1].trim() : "";
          return rowAdvertiser === advertiser;
        });
        
        // Group by date and aggregate metrics
        const groupedByDate = advertiserRows.reduce((acc, row) => {
          const date = row.DATE;
          if (!acc[date]) {
            acc[date] = {
              date,
              impressions: 0,
              clicks: 0,
              transactions: 0,
              revenue: 0,
              spend: 0
            };
          }
          
          acc[date].impressions += Number(row.IMPRESSIONS) || 0;
          acc[date].clicks += Number(row.CLICKS) || 0;
          acc[date].transactions += Number(row.TRANSACTIONS) || 0;
          acc[date].revenue += Number(row.REVENUE) || 0;
          const impressions = Number(row.IMPRESSIONS) || 0;
          acc[date].spend += (impressions / 1000) * 15;
          
          return acc;
        }, {});
        
        const timeSeriesData = Object.values(groupedByDate)
          .map((entry: any) => {
            const impressions = entry.impressions;
            const clicks = entry.clicks;
            const transactions = entry.transactions;
            const revenue = entry.revenue;
            const spend = entry.spend;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const roas = spend > 0 ? revenue / spend : 0;
            
            return {
              date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(entry.date)),
              rawDate: new Date(entry.date),
              impressions,
              clicks,
              transactions,
              revenue,
              spend,
              ctr,
              roas
            };
          })
          .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
        
        const totals = {
          impressions: timeSeriesData.reduce((sum, row) => sum + row.impressions, 0),
          clicks: timeSeriesData.reduce((sum, row) => sum + row.clicks, 0),
          transactions: timeSeriesData.reduce((sum, row) => sum + row.transactions, 0),
          revenue: timeSeriesData.reduce((sum, row) => sum + row.revenue, 0),
          spend: timeSeriesData.reduce((sum, row) => sum + row.spend, 0),
        };
        
        const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        const avgRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

        return {
          name: advertiser,
          timeSeriesData,
          totals,
          avgCtr,
          avgRoas
        };
      });
    } else {
      // Original campaign view logic
      const campaigns = Array.from(new Set(filteredDataByDate.map(row => row["CAMPAIGN ORDER NAME"]))).sort();
      
      return campaigns.map(campaign => {
        const campaignRows = filteredDataByDate.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);
        campaignRows.sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
        
        const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
        
        const timeSeriesData = campaignRows.map(row => {
          const impressions = Number(row.IMPRESSIONS) || 0;
          const clicks = Number(row.CLICKS) || 0;
          const transactions = Number(row.TRANSACTIONS) || 0;
          const revenue = Number(row.REVENUE) || 0;
          const spend = (impressions / 1000) * 15;
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

        const totals = {
          impressions: timeSeriesData.reduce((sum, row) => sum + row.impressions, 0),
          clicks: timeSeriesData.reduce((sum, row) => sum + row.clicks, 0),
          transactions: timeSeriesData.reduce((sum, row) => sum + row.transactions, 0),
          revenue: timeSeriesData.reduce((sum, row) => sum + row.revenue, 0),
          spend: timeSeriesData.reduce((sum, row) => sum + row.spend, 0),
        };
        
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
    }
  }, [filteredData, dateRange, viewMode]);

  const getSafeId = (name: string) => {
    return `gradient-${name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')}`;
  };

  if (!data || data.length === 0) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <ToggleGroup type="single" value={viewMode} onValueChange={(value: ViewMode) => value && setViewMode(value)}>
          <ToggleGroupItem value="campaign" aria-label="View by Campaign">
            <Flag className="h-4 w-4 mr-2" />
            Campaigns
          </ToggleGroupItem>
          <ToggleGroupItem value="advertiser" aria-label="View by Advertiser">
            <User className="h-4 w-4 mr-2" />
            Advertisers
          </ToggleGroupItem>
        </ToggleGroup>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
          
          <MultiSelect
            options={advertiserOptions}
            selected={selectedAdvertisers}
            onChange={setSelectedAdvertisers}
            placeholder="Advertiser"
            className="w-[200px]"
          />
          
          <MultiSelect
            options={campaignOptions}
            selected={selectedCampaigns}
            onChange={setSelectedCampaigns}
            placeholder="Campaign"
            className="w-[200px]"
            popoverClassName="w-[400px]"
          />
        </div>
      </div>
      
      {groupedData.map((item) => {
        const impressionsId = `impressions-${getSafeId(item.name)}`;
        const clicksId = `clicks-${getSafeId(item.name)}`;
        const transactionsId = `transactions-${getSafeId(item.name)}`;
        const revenueId = `revenue-${getSafeId(item.name)}`;
        const ctrId = `ctr-${getSafeId(item.name)}`;
        const roasId = `roas-${getSafeId(item.name)}`;
        
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
                  <div className="flex items-center space-x-2">
                    <div className="bg-sky-100 p-2 rounded-full">
                      <Eye className="h-4 w-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(item.totals.impressions, { abbreviate: false })}</p>
                      <p className="text-xs text-muted-foreground">Impressions</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="bg-violet-100 p-2 rounded-full">
                      <MousePointer className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(item.totals.clicks, { abbreviate: false })}</p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="bg-indigo-100 p-2 rounded-full">
                      <Percent className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(item.avgCtr, { decimals: 2, suffix: '%' })}</p>
                      <p className="text-xs text-muted-foreground">CTR</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <ShoppingCart className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatNumber(item.totals.transactions, { abbreviate: false })}</p>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="bg-green-100 p-2 rounded-full">
                      <DollarSign className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">${formatNumber(item.totals.revenue, { abbreviate: false })}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>

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

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 h-24">
                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={item.timeSeriesData}>
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

                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={item.timeSeriesData}>
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

                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={item.timeSeriesData}>
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

                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={item.timeSeriesData}>
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

                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={item.timeSeriesData}>
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

                  <div className="hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={item.timeSeriesData}>
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

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
import { Eye, MousePointer, ShoppingCart, DollarSign, ChevronRight, Percent, TrendingUp, FilterIcon } from "lucide-react";
import { formatNumber, normalizeDate, setToEndOfDay, setToStartOfDay, parseDateString, createConsistentDate } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { MultiSelect } from "./MultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CampaignSparkChartsProps {
  data: any[];
  dateRange?: DateRange;
}

type ViewMode = "campaign" | "advertiser";

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
    console.log('CampaignSparkCharts received data length:', data.length);
    
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
    
    console.log('CampaignSparkCharts filtered data length:', result.length);
    return result;
  }, [data, selectedCampaigns, selectedAdvertisers]);

  const getAdvertiserFromCampaign = (campaignName: string): string => {
    const match = campaignName.match(/SM:\s+([^-]+)/);
    return match ? match[1].trim() : "";
  };

  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    let filteredDataByDate = filteredData;
    if (dateRange?.from) {
      console.log(`Filtering spark chart data with date range: ${dateRange.from.toISOString()} to ${dateRange.to ? dateRange.to.toISOString() : 'now'}`);
      
      filteredDataByDate = filteredData.filter(row => {
        if (!row.DATE) {
          console.warn(`Row missing DATE: ${JSON.stringify(row)}`);
          return false;
        }
        
        try {
          const dateStr = String(row.DATE).trim();
          
          const rowDate = parseDateString(dateStr);
          if (!rowDate) {
            console.warn(`Could not parse date in row: ${dateStr}`);
            return false;
          }
          
          const fromDate = setToStartOfDay(createConsistentDate(dateRange.from));
          
          if (!dateRange.to) {
            const isAfterFrom = rowDate >= fromDate;
            if (dateStr.includes('2023-04-09') || dateStr.includes('2023-04-08')) {
              console.log(`Spark chart date comparison for ${dateStr}: fromDate=${fromDate.toISOString()}, rowDate=${rowDate.toISOString()}, isAfterFrom=${isAfterFrom}`);
            }
            return isAfterFrom;
          }
          
          const toDate = setToEndOfDay(createConsistentDate(dateRange.to));
          
          const isInRange = rowDate >= fromDate && rowDate <= toDate;
          if (dateStr.includes('2023-04-09') || dateStr.includes('2023-04-08')) {
            console.log(`Spark chart date comparison for ${dateStr}: fromDate=${fromDate.toISOString()}, toDate=${toDate.toISOString()}, rowDate=${rowDate.toISOString()}, isInRange=${isInRange}`);
          }
          return isInRange;
        } catch (error) {
          console.error(`Error filtering by date for row ${JSON.stringify(row)}:`, error);
          return false;
        }
      });
      
      const filteredDates = filteredDataByDate.map(row => row.DATE).sort();
      console.log(`Filtered spark chart data has ${filteredDataByDate.length} rows across ${new Set(filteredDates).size} unique dates`);
      if (filteredDates.length > 0) {
        console.log(`Filtered date range: ${filteredDates[0]} to ${filteredDates[filteredDates.length-1]}`);
      }
    }

    if (viewMode === "campaign") {
      const campaigns = Array.from(new Set(filteredDataByDate.map(row => row["CAMPAIGN ORDER NAME"]))).sort();
      
      return campaigns.map(campaign => {
        const campaignRows = filteredDataByDate.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);
        
        campaignRows.sort((a, b) => {
          try {
            const dateA = parseDateString(a.DATE);
            const dateB = parseDateString(b.DATE);
            
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime();
          } catch (error) {
            console.error(`Error sorting dates: ${a.DATE} vs ${b.DATE}`, error);
            return 0;
          }
        });
        
        const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
        
        const timeSeriesData = campaignRows.map(row => {
          try {
            const parsedDate = parseDateString(row.DATE);
            if (!parsedDate) {
              console.warn(`Invalid date while creating time series: ${row.DATE}`);
              return null;
            }
            
            const impressions = Number(row.IMPRESSIONS) || 0;
            const clicks = Number(row.CLICKS) || 0;
            const transactions = Number(row.TRANSACTIONS) || 0;
            const revenue = Number(row.REVENUE) || 0;
            const spend = (impressions / 1000) * 15;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const roas = spend > 0 ? revenue / spend : 0;
            
            return {
              date: dateFormat.format(parsedDate),
              rawDate: parsedDate,
              impressions,
              clicks,
              transactions,
              revenue,
              spend,
              ctr,
              roas
            };
          } catch (error) {
            console.error(`Error processing row for time series: ${row.DATE}`, error);
            return null;
          }
        }).filter(Boolean);

        if (timeSeriesData.length === 0) {
          return null;
        }

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
      }).filter(Boolean);
    } else {
      const advertisersMap = new Map<string, any[]>();
      
      filteredDataByDate.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = getAdvertiserFromCampaign(campaignName);
        if (!advertiser) return;
        
        if (!advertisersMap.has(advertiser)) {
          advertisersMap.set(advertiser, []);
        }
        advertisersMap.get(advertiser)?.push(row);
      });
      
      const advertisers = Array.from(advertisersMap.keys()).sort((a, b) => a.localeCompare(b));
      
      return advertisers.map(advertiser => {
        const advertiserRows = advertisersMap.get(advertiser) || [];
        
        const dateGroups = new Map<string, any[]>();
        advertiserRows.forEach(row => {
          try {
            const parsedDate = parseDateString(row.DATE);
            if (!parsedDate) {
              console.warn(`Invalid date in advertiser aggregation: ${row.DATE}`);
              return;
            }
            
            const dateString = parsedDate.toISOString().split('T')[0];
            
            if (!dateGroups.has(dateString)) {
              dateGroups.set(dateString, []);
            }
            dateGroups.get(dateString)?.push(row);
          } catch (error) {
            console.error(`Error processing advertiser row by date: ${row.DATE}`, error);
          }
        });
        
        const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
        const dates = Array.from(dateGroups.keys()).sort();
        
        const timeSeriesData = dates.map(dateString => {
          try {
            const dateRows = dateGroups.get(dateString) || [];
            const date = new Date(`${dateString}T12:00:00Z`);
            
            const impressions = dateRows.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0);
            const clicks = dateRows.reduce((sum, row) => sum + (Number(row.CLICKS) || 0), 0);
            const transactions = dateRows.reduce((sum, row) => sum + (Number(row.TRANSACTIONS) || 0), 0);
            const revenue = dateRows.reduce((sum, row) => sum + (Number(row.REVENUE) || 0), 0);
            const spend = (impressions / 1000) * 15;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const roas = spend > 0 ? revenue / spend : 0;
            
            return {
              date: dateFormat.format(date),
              rawDate: date,
              impressions,
              clicks,
              transactions,
              revenue,
              spend,
              ctr,
              roas
            };
          } catch (error) {
            console.error(`Error creating time series for date ${dateString}`, error);
            return null;
          }
        }).filter(Boolean);
        
        if (timeSeriesData.length === 0) {
          return null;
        }
        
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
      }).filter(Boolean);
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
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">View by:</span>
          <Select
            value={viewMode}
            onValueChange={(value: ViewMode) => setViewMode(value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign">Campaign</SelectItem>
              <SelectItem value="advertiser">Advertiser</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
          
          <div className="flex items-center gap-2">
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
      </div>
      
      {chartData.map((item) => {
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

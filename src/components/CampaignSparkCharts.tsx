
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trendingColor } from "@/utils/anomalyColors";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Info, TrendingDown, TrendingUp } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CampaignSparkChartsProps {
  data: any[];
  dateRange?: DateRange;
  selectedCampaigns?: string[];
}

const CampaignSparkCharts = ({ 
  data, 
  dateRange,
  selectedCampaigns = []
}: CampaignSparkChartsProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    // Filter by date if dateRange is provided
    if (dateRange && dateRange.from) {
      filtered = filtered.filter(row => {
        try {
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
        } catch (error) {
          console.error("Error filtering by date:", error);
          return false;
        }
      });
    }
    
    // Filter by selected campaigns if provided
    if (selectedCampaigns.length > 0) {
      filtered = filtered.filter(row => 
        selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"])
      );
    }
    
    return filtered;
  };

  // Group by campaign and calculate daily metrics
  const campaignMetrics = useMemo(() => {
    const filteredData = getFilteredData();
    if (!filteredData.length) return [];
    
    const campaigns = {};
    
    // Group data by campaign
    filteredData.forEach(row => {
      if (!row["CAMPAIGN ORDER NAME"]) return;
      
      const campaign = row["CAMPAIGN ORDER NAME"];
      if (!campaigns[campaign]) {
        campaigns[campaign] = {
          name: campaign,
          dateData: {},
          metrics: {
            totalImpressions: 0,
            totalClicks: 0,
            totalRevenue: 0,
            ctr: 0,
            cpc: 0,
            conversionRate: 0,
            roas: 0,
          },
        };
      }
      
      // Group by date for time-series data
      const date = row.DATE;
      if (!campaigns[campaign].dateData[date]) {
        campaigns[campaign].dateData[date] = {
          date,
          impressions: 0,
          clicks: 0,
          revenue: 0,
        };
      }
      
      campaigns[campaign].dateData[date].impressions += Number(row.IMPRESSIONS) || 0;
      campaigns[campaign].dateData[date].clicks += Number(row.CLICKS) || 0;
      campaigns[campaign].dateData[date].revenue += Number(row.REVENUE) || 0;
      
      // Aggregate totals
      campaigns[campaign].metrics.totalImpressions += Number(row.IMPRESSIONS) || 0;
      campaigns[campaign].metrics.totalClicks += Number(row.CLICKS) || 0;
      campaigns[campaign].metrics.totalRevenue += Number(row.REVENUE) || 0;
    });
    
    // Calculate derived metrics and format time-series data
    return Object.values(campaigns).map((campaign: any) => {
      // Sort date data chronologically
      const sortedDates = Object.keys(campaign.dateData).sort((a, b) => 
        new Date(a).getTime() - new Date(b).getTime()
      );
      
      const timeSeriesData = sortedDates.map(date => campaign.dateData[date]);
      
      // Calculate CTR, CPC, conversion rate, and ROAS
      const { totalImpressions, totalClicks, totalRevenue } = campaign.metrics;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? totalRevenue / totalClicks : 0;
      
      // Assuming 15 cents per 1000 impressions as the CPM
      const totalSpend = (totalImpressions / 1000) * 15;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      
      // Calculate trends
      let impressionTrend = 0;
      let clickTrend = 0;
      let revenueTrend = 0;
      
      if (timeSeriesData.length >= 6) {
        const midPoint = Math.floor(timeSeriesData.length / 2);
        
        const firstHalf = timeSeriesData.slice(0, midPoint);
        const secondHalf = timeSeriesData.slice(midPoint);
        
        const firstHalfImpressions = firstHalf.reduce((sum, item) => sum + item.impressions, 0);
        const secondHalfImpressions = secondHalf.reduce((sum, item) => sum + item.impressions, 0);
        
        const firstHalfClicks = firstHalf.reduce((sum, item) => sum + item.clicks, 0);
        const secondHalfClicks = secondHalf.reduce((sum, item) => sum + item.clicks, 0);
        
        const firstHalfRevenue = firstHalf.reduce((sum, item) => sum + item.revenue, 0);
        const secondHalfRevenue = secondHalf.reduce((sum, item) => sum + item.revenue, 0);
        
        impressionTrend = firstHalfImpressions > 0 
          ? ((secondHalfImpressions - firstHalfImpressions) / firstHalfImpressions) * 100 
          : secondHalfImpressions > 0 ? 100 : 0;
          
        clickTrend = firstHalfClicks > 0 
          ? ((secondHalfClicks - firstHalfClicks) / firstHalfClicks) * 100 
          : secondHalfClicks > 0 ? 100 : 0;
          
        revenueTrend = firstHalfRevenue > 0 
          ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 
          : secondHalfRevenue > 0 ? 100 : 0;
      }
      
      return {
        name: campaign.name,
        timeSeriesData,
        metrics: {
          ...campaign.metrics,
          ctr,
          cpc,
          roas,
          impressionTrend,
          clickTrend,
          revenueTrend,
        },
      };
    }).sort((a, b) => b.metrics.totalImpressions - a.metrics.totalImpressions);
  }, [data, dateRange, selectedCampaigns]);

  const formatNumber = (value: number) => value.toLocaleString();
  const formatMoney = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const formatChange = (value: number) => {
    const formatted = value.toFixed(1);
    return value > 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const renderTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <TrendingUp className="w-4 h-4" />;
    } else if (trend < 0) {
      return <TrendingDown className="w-4 h-4" />;
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Campaign Performance</h2>
        <Badge 
          variant="outline" 
          className="cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Show Less" : "Show All Metrics"} <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </Badge>
      </div>

      {campaignMetrics.length > 0 ? (
        <ScrollArea className="h-[800px] pr-4">
          <div className="grid gap-6">
            {campaignMetrics.map((campaign, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex justify-between items-start">
                    <div className="text-base font-semibold truncate">
                      {campaign.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`flex items-center gap-1 ${trendingColor(campaign.metrics.impressionTrend)}`}>
                        {renderTrendIcon(campaign.metrics.impressionTrend)}
                        <span>{formatChange(campaign.metrics.impressionTrend)}</span>
                      </div>
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-xs">
                          <p className="font-medium">Trend Calculation</p>
                          <p className="mt-1">
                            This trend compares the first half of the date range to the second half, 
                            showing the percentage change in impressions over time.
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0 pb-4">
                  <div className="grid grid-cols-2 gap-6 mt-2 sm:grid-cols-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Impressions</p>
                      <div className="mt-1 flex items-baseline">
                        <p className="text-2xl font-semibold">{formatNumber(campaign.metrics.totalImpressions)}</p>
                      </div>
                      <div className="h-16 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={campaign.timeSeriesData}>
                            <Line
                              type="monotone"
                              dataKey="impressions"
                              stroke="#4ade80"
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                            <Tooltip formatter={(value: any) => [formatNumber(value), "Impressions"]} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Clicks</p>
                      <div className="mt-1 flex items-baseline">
                        <p className="text-2xl font-semibold">{formatNumber(campaign.metrics.totalClicks)}</p>
                        <p className={`ml-2 text-sm ${trendingColor(campaign.metrics.clickTrend)}`}>
                          {renderTrendIcon(campaign.metrics.clickTrend)}
                          <span className="ml-1 inline-block">{formatChange(campaign.metrics.clickTrend)}</span>
                        </p>
                      </div>
                      <div className="h-16 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={campaign.timeSeriesData}>
                            <Line
                              type="monotone"
                              dataKey="clicks"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                            <Tooltip formatter={(value: any) => [formatNumber(value), "Clicks"]} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                      <div className="mt-1 flex items-baseline">
                        <p className="text-2xl font-semibold">${formatNumber(Math.round(campaign.metrics.totalRevenue))}</p>
                        <p className={`ml-2 text-sm ${trendingColor(campaign.metrics.revenueTrend)}`}>
                          {renderTrendIcon(campaign.metrics.revenueTrend)}
                          <span className="ml-1 inline-block">{formatChange(campaign.metrics.revenueTrend)}</span>
                        </p>
                      </div>
                      <div className="h-16 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={campaign.timeSeriesData}>
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                            <Tooltip formatter={(value: any) => [`$${formatNumber(Math.round(value))}`, "Revenue"]} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CTR</p>
                      <div className="mt-1 flex items-baseline">
                        <p className="text-2xl font-semibold">{campaign.metrics.ctr.toFixed(2)}%</p>
                      </div>
                      <div className="h-16 mt-2 flex items-end">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">ROAS</span>
                            <span className="text-xs font-medium">{campaign.metrics.roas.toFixed(2)}x</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${campaign.metrics.roas >= 1 ? 'bg-green-500' : campaign.metrics.roas >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(campaign.metrics.roas * 50, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {showDetails && (
                    <Accordion type="single" collapsible className="w-full mt-4">
                      <AccordionItem value="details" className="border-t pt-2">
                        <AccordionTrigger className="text-sm">Detailed Metrics</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-2">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Cost Per Click (CPC)</p>
                              <p className="text-sm font-medium mt-1">{formatMoney(campaign.metrics.cpc)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Estimated Spend</p>
                              <p className="text-sm font-medium mt-1">{formatMoney((campaign.metrics.totalImpressions / 1000) * 15)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Return on Ad Spend</p>
                              <p className="text-sm font-medium mt-1">{campaign.metrics.roas.toFixed(2)}x</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Revenue per Click</p>
                              <p className="text-sm font-medium mt-1">
                                {campaign.metrics.totalClicks > 0 
                                  ? formatMoney(campaign.metrics.totalRevenue / campaign.metrics.totalClicks) 
                                  : '$0.00'}
                              </p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No campaign data available</p>
        </div>
      )}
    </div>
  );
};

export default CampaignSparkCharts;

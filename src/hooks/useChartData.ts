
import { useMemo } from "react";
import { setToEndOfDay, setToStartOfDay, parseDateString } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { ViewMode, ChartItem } from "@/types/campaigns";
import { calculateSpend, getAdvertiserFromCampaign } from "@/utils/chartUtils";

export const useChartData = (
  data: any[],
  dateRange: DateRange | undefined,
  selectedCampaigns: string[],
  selectedAdvertisers: string[],
  viewMode: ViewMode,
  spendMode: 'default' | 'custom',
  customCPM: number
) => {
  // Filter data by date range
  const filteredDataByDate = useMemo(() => {
    if (!data || data.length === 0) {
      console.log('No data provided to useChartData');
      return [];
    }
    
    console.log(`useChartData filtering ${data.length} rows with dateRange:`, dateRange);
    
    if (!dateRange?.from) {
      return data;
    }
    
    const fromDate = setToStartOfDay(dateRange.from);
    const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());
    
    console.log(`Filtering between ${fromDate.toISOString()} and ${toDate.toISOString()}`);
    
    return data.filter(row => {
      if (!row.DATE || row.DATE === 'Totals') {
        return true;
      }
      
      try {
        const dateStr = String(row.DATE).trim();
        const rowDate = parseDateString(dateStr);
        
        if (!rowDate) {
          console.warn(`Could not parse date in useChartData filtering: ${dateStr}`);
          return false;
        }
        
        const isInRange = rowDate >= fromDate && rowDate <= toDate;
        return isInRange;
      } catch (error) {
        console.error(`Error in date filtering for row ${JSON.stringify(row)}:`, error);
        return false;
      }
    });
  }, [data, dateRange]);

  // Filter data by campaigns and advertisers
  const filteredData = useMemo(() => {
    let result = filteredDataByDate;
    
    if (selectedAdvertisers.length > 0) {
      result = result.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = getAdvertiserFromCampaign(campaignName);
        return selectedAdvertisers.includes(advertiser);
      });
    }
    
    if (selectedCampaigns.length > 0) {
      result = result.filter(row => selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }
    
    return result;
  }, [filteredDataByDate, selectedCampaigns, selectedAdvertisers]);

  // Generate chart data based on filtered data and view mode
  const chartData = useMemo((): ChartItem[] => {
    if (!filteredData || filteredData.length === 0) {
      console.log('No filtered data available for chart data generation');
      return [];
    }

    console.log(`Generating chart data from ${filteredData.length} rows`);
    
    if (viewMode === "campaign") {
      const campaigns = Array.from(new Set(filteredData
        .filter(row => row.DATE !== 'Totals')
        .map(row => row["CAMPAIGN ORDER NAME"])))
        .sort();
      
      console.log(`Found ${campaigns.length} unique campaigns for charts`);
      
      return campaigns.map(campaign => {
        const campaignRows = filteredData.filter(row => 
          row["CAMPAIGN ORDER NAME"] === campaign && row.DATE !== 'Totals'
        );
        
        if (campaignRows.length === 0) {
          return null;
        }
        
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
            const spend = calculateSpend(impressions, spendMode, customCPM);
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
      
      filteredData.forEach(row => {
        if (row.DATE === 'Totals') return;
        
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
            const spend = calculateSpend(impressions, spendMode, customCPM);
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
  }, [filteredData, viewMode, spendMode, customCPM]);

  return { filteredData, chartData };
};

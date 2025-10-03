import { useMemo, useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { setToEndOfDay, setToStartOfDay, parseDateString } from "@/lib/utils";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { CampaignDataRow } from "@/types/campaign";
import { SparkChartDataPoint } from "@/types/sparkCharts";

type ViewMode = "campaign" | "advertiser";

interface SparkChartsDataProps {
  data: CampaignDataRow[];
  dateRange?: DateRange;
  useGlobalFilters?: boolean;
}

// Helper function to generate all dates in a range
const generateDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

// Helper function to fill missing dates with zero values
const fillMissingDates = (timeSeriesData: SparkChartDataPoint[], allDates: Date[]): SparkChartDataPoint[] => {
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const dataByDate = new Map();

  timeSeriesData.forEach(item => {
    if (item.rawDate) {
      const year = item.rawDate.getFullYear();
      const month = String(item.rawDate.getMonth() + 1).padStart(2, '0');
      const day = String(item.rawDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      dataByDate.set(dateKey, item);
    }
  });

  const actualDataDates = timeSeriesData
    .map(item => item.rawDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  if (actualDataDates.length === 0) {
    return [];
  }

  const firstDataDate = actualDataDates[0];
  // Instead of stopping at last data date, extend to the end of the full filter range
  const lastFilterDate = allDates.length > 0 ? allDates[allDates.length - 1] : actualDataDates[actualDataDates.length - 1];

  const result = allDates
    .filter(date => date >= firstDataDate && date <= lastFilterDate)
    .map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const existingData = dataByDate.get(dateKey);

      if (existingData) {
        return existingData;
      } else {
        // Fill missing dates with zeros to show data gaps visually
        return {
          date: dateFormat.format(date),
          rawDate: date,
          impressions: 0,
          clicks: 0,
          transactions: 0,
          revenue: 0,
          spend: 0,
          ctr: null,
          roas: null
        };
      }
    });

  return result;
};

export const useSparkChartsData = ({ data, dateRange, useGlobalFilters = false }: SparkChartsDataProps) => {
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("campaign");

  const { extractAdvertiserName, extractAgencyInfo, isTestCampaign } = useCampaignFilter();

  // Agency options
  const agencyOptions = useMemo(() => {
    const agencies = new Set<string>();

    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return;

      const { agency } = extractAgencyInfo(campaignName);
      if (agency) agencies.add(agency);
    });

    return Array.from(agencies)
      .sort((a, b) => a.localeCompare(b))
      .map(agency => ({ value: agency, label: agency }));
  }, [data, extractAgencyInfo, isTestCampaign]);

  // Advertiser options
  const advertiserOptions = useMemo(() => {
    const advertisers = new Set<string>();

    let filteredData = data;
    if (selectedAgencies.length > 0) {
      filteredData = data.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const { agency } = extractAgencyInfo(campaignName);
        return selectedAgencies.includes(agency);
      });
    }

    filteredData.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return;

      const advertiser = extractAdvertiserName(campaignName);
      if (advertiser) advertisers.add(advertiser);
    });

    return Array.from(advertisers)
      .sort((a, b) => a.localeCompare(b))
      .map(advertiser => ({ value: advertiser, label: advertiser, group: 'Advertisers' }));
  }, [data, selectedAgencies, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  // Campaign options
  const campaignOptions = useMemo(() => {
    let filteredData = data.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      return !isTestCampaign(campaignName);
    });

    if (selectedAgencies.length > 0) {
      filteredData = filteredData.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const { agency } = extractAgencyInfo(campaignName);
        return selectedAgencies.includes(agency);
      });
    }

    if (selectedAdvertisers.length > 0) {
      filteredData = filteredData.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = extractAdvertiserName(campaignName);
        return selectedAdvertisers.includes(advertiser);
      });
    }

    const uniqueCampaigns = Array.from(new Set(filteredData.map(row => row["CAMPAIGN ORDER NAME"])));
    return uniqueCampaigns
      .sort((a, b) => a.localeCompare(b))
      .map(campaign => ({ value: campaign, label: campaign, group: 'Campaigns' }));
  }, [data, selectedAgencies, selectedAdvertisers, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  // Reset filters when dependencies change
  useEffect(() => {
    if (selectedAgencies.length > 0) {
      setSelectedCampaigns(prev => {
        return prev.filter(campaign => {
          const campaignRows = data.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);
          if (campaignRows.length === 0) return false;

          const campaignName = campaignRows[0]["CAMPAIGN ORDER NAME"] || "";
          const { agency } = extractAgencyInfo(campaignName);
          return selectedAgencies.includes(agency);
        });
      });

      setSelectedAdvertisers(prev => {
        return prev.filter(advertiser => {
          return data.some(row => {
            const campaignName = row["CAMPAIGN ORDER NAME"] || "";
            const rowAdvertiser = extractAdvertiserName(campaignName);
            const { agency } = extractAgencyInfo(campaignName);
            return rowAdvertiser === advertiser && selectedAgencies.includes(agency);
          });
        });
      });
    }

    if (selectedAdvertisers.length > 0) {
      setSelectedCampaigns(prev => {
        return prev.filter(campaign => {
          const campaignRows = data.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);
          if (campaignRows.length === 0) return false;

          const campaignName = campaignRows[0]["CAMPAIGN ORDER NAME"] || "";
          const advertiser = extractAdvertiserName(campaignName);
          return selectedAdvertisers.includes(advertiser);
        });
      });
    }
  }, [selectedAgencies, selectedAdvertisers, data, extractAdvertiserName, extractAgencyInfo]);

  // Filter data by date range
  const filteredDataByDate = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!dateRange?.from) return data;

    const fromDate = setToStartOfDay(dateRange.from);
    const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());

    return data.filter(row => {
      if (!row.DATE || row.DATE === 'Totals') return true;

      try {
        const dateStr = String(row.DATE).trim();
        const rowDate = parseDateString(dateStr);
        if (!rowDate) return false;
        return rowDate >= fromDate && rowDate <= toDate;
      } catch (error) {
        return false;
      }
    });
  }, [data, dateRange]);

  // Apply all filters
  const filteredData = useMemo(() => {
    if (useGlobalFilters) {
      return filteredDataByDate.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        return !isTestCampaign(campaignName);
      });
    }

    let result = filteredDataByDate.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      return !isTestCampaign(campaignName);
    });

    if (selectedAgencies.length > 0) {
      result = result.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const { agency } = extractAgencyInfo(campaignName);
        return selectedAgencies.includes(agency);
      });
    }

    if (selectedAdvertisers.length > 0) {
      result = result.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = extractAdvertiserName(campaignName);
        return selectedAdvertisers.includes(advertiser);
      });
    }

    if (selectedCampaigns.length > 0) {
      result = result.filter(row => selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }

    return result;
  }, [filteredDataByDate, selectedAgencies, selectedAdvertisers, selectedCampaigns, isTestCampaign, extractAdvertiserName, extractAgencyInfo, useGlobalFilters]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    let completeDateRange: Date[] = [];

    if (dateRange?.from) {
      const fromDate = setToStartOfDay(dateRange.from);
      const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());
      completeDateRange = generateDateRange(fromDate, toDate);
    } else {
      const allValidDates = data
        .filter(row => row.DATE !== 'Totals' && !isTestCampaign(row["CAMPAIGN ORDER NAME"] || ""))
        .map(row => parseDateString(row.DATE))
        .filter(Boolean)
        .sort((a, b) => a.getTime() - b.getTime());

      if (allValidDates.length === 0) return [];

      const startDate = allValidDates[0];
      const endDate = allValidDates[allValidDates.length - 1];
      completeDateRange = generateDateRange(startDate, endDate);
    }

    if (viewMode === "campaign") {
      const campaigns = Array.from(new Set(filteredData
        .filter(row => row.DATE !== 'Totals')
        .map(row => row["CAMPAIGN ORDER NAME"])))
        .sort();

      return campaigns.map(campaign => {
        const allCampaignRows = data.filter(row =>
          row["CAMPAIGN ORDER NAME"] === campaign &&
          row.DATE !== 'Totals' &&
          !isTestCampaign(row["CAMPAIGN ORDER NAME"] || "")
        );

        if (allCampaignRows.length === 0) return null;

        allCampaignRows.sort((a, b) => {
          const dateA = parseDateString(a.DATE);
          const dateB = parseDateString(b.DATE);
          if (!dateA || !dateB) return 0;
          return dateA.getTime() - dateB.getTime();
        });

        const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

        const rawTimeSeriesData = allCampaignRows.map(row => {
          const parsedDate = parseDateString(row.DATE);
          if (!parsedDate) return null;

          const impressions = Number(row.IMPRESSIONS) || 0;
          const clicks = Number(row.CLICKS) || 0;
          const transactions = Number(row.TRANSACTIONS) || 0;
          const revenue = Number(row.REVENUE) || 0;
          const spend = Number(row.SPEND) || 0;
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
        }).filter(Boolean);

        if (rawTimeSeriesData.length === 0) return null;

        const fullTimeSeriesData = fillMissingDates(rawTimeSeriesData, completeDateRange);

        const timeSeriesData = dateRange?.from ?
          fullTimeSeriesData.filter(item => {
            const fromDate = setToStartOfDay(dateRange.from!);
            const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());
            return item.rawDate >= fromDate && item.rawDate <= toDate;
          }) : fullTimeSeriesData;

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
      // Advertiser view logic (similar structure)
      const advertisersMap = new Map<string, CampaignDataRow[]>();

      filteredData.forEach(row => {
        if (row.DATE === 'Totals') return;

        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = extractAdvertiserName(campaignName);
        if (!advertiser) return;

        if (!advertisersMap.has(advertiser)) {
          advertisersMap.set(advertiser, []);
        }
        advertisersMap.get(advertiser)?.push(row);
      });

      const advertisers = Array.from(advertisersMap.keys()).sort((a, b) => a.localeCompare(b));

      return advertisers.map(advertiser => {
        const advertiserRows = advertisersMap.get(advertiser) || [];

        const dateGroups = new Map<string, CampaignDataRow[]>();
        advertiserRows.forEach(row => {
          const parsedDate = parseDateString(row.DATE);
          if (!parsedDate) return;

          const dateString = parsedDate.toISOString().split('T')[0];
          if (!dateGroups.has(dateString)) {
            dateGroups.set(dateString, []);
          }
          dateGroups.get(dateString)?.push(row);
        });

        const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
        const dates = Array.from(dateGroups.keys()).sort();

        const rawTimeSeriesData = dates.map(dateString => {
          const dateRows = dateGroups.get(dateString) || [];
          const date = new Date(`${dateString}T12:00:00Z`);

          const impressions = dateRows.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0);
          const clicks = dateRows.reduce((sum, row) => sum + (Number(row.CLICKS) || 0), 0);
          const transactions = dateRows.reduce((sum, row) => sum + (Number(row.TRANSACTIONS) || 0), 0);
          const revenue = dateRows.reduce((sum, row) => sum + (Number(row.REVENUE) || 0), 0);
          const spend = dateRows.reduce((sum, row) => sum + (Number(row.SPEND) || 0), 0);
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
        }).filter(Boolean);

        if (rawTimeSeriesData.length === 0) return null;

        const timeSeriesData = fillMissingDates(rawTimeSeriesData, completeDateRange);

        const totals = {
          impressions: rawTimeSeriesData.reduce((sum, row) => sum + row.impressions, 0),
          clicks: rawTimeSeriesData.reduce((sum, row) => sum + row.clicks, 0),
          transactions: rawTimeSeriesData.reduce((sum, row) => sum + row.transactions, 0),
          revenue: rawTimeSeriesData.reduce((sum, row) => sum + row.revenue, 0),
          spend: rawTimeSeriesData.reduce((sum, row) => sum + row.spend, 0),
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
  }, [filteredData, viewMode, extractAdvertiserName, dateRange, data, isTestCampaign]);

  return {
    chartData,
    viewMode,
    setViewMode,
    selectedAgencies,
    setSelectedAgencies,
    selectedAdvertisers,
    setSelectedAdvertisers,
    selectedCampaigns,
    setSelectedCampaigns,
    agencyOptions,
    advertiserOptions,
    campaignOptions,
    useGlobalFilters
  };
};

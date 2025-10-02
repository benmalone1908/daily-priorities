import { useState, useMemo } from "react";
import { parseDateString } from "@/lib/utils";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { CampaignDataRow } from "@/types/campaign";

export type GroupingLevel = "campaign" | "advertiser" | "agency" | "date";
export type TimeAggregation = "daily" | "weekly" | "monthly" | "total";

interface UseDataTableProps {
  data: CampaignDataRow[];
  useGlobalFilters?: boolean;
}

export interface DataTableState {
  groupingLevel: GroupingLevel;
  timeAggregation: TimeAggregation;
  showComparisons: boolean;
  page: number;
  rowsPerPage: number;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  includeAttributionOnly: boolean;
}

export interface DataTableActions {
  setGroupingLevel: (level: GroupingLevel) => void;
  setTimeAggregation: (aggregation: TimeAggregation) => void;
  setShowComparisons: (show: boolean) => void;
  setPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;
  setSortColumn: (column: string) => void;
  setSortDirection: (direction: "asc" | "desc") => void;
  setIncludeAttributionOnly: (include: boolean) => void;
  handleSort: (column: string) => void;
  exportToCSV: () => void;
}

/**
 * Custom hook for managing data table state and processing
 * Extracted from RawDataTableImproved.tsx for better maintainability
 */
export const useDataTable = ({ data, useGlobalFilters = false }: UseDataTableProps) => {
  const { isTestCampaign, extractAdvertiserName, extractAgencyInfo } = useCampaignFilter();

  // State management
  const [state, setState] = useState<DataTableState>({
    groupingLevel: "campaign",
    timeAggregation: "daily",
    showComparisons: false,
    page: 1,
    rowsPerPage: 10,
    sortColumn: "groupKey",
    sortDirection: "asc",
    includeAttributionOnly: true
  });

  // Filter data based on attribution settings
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.filter(row => {
      // Filter test campaigns
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return false;

      // Filter attribution-only data if enabled
      if (state.includeAttributionOnly) {
        const revenue = parseFloat(row.REVENUE) || 0;
        return revenue > 0;
      }

      return true;
    });
  }, [data, isTestCampaign, state.includeAttributionOnly]);

  // Helper function to get week key
  const getWeekKey = (date: Date, mostRecentDate: Date | null) => {
    if (!mostRecentDate) return "";

    const diffTime = mostRecentDate.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7);

    const weekStart = new Date(mostRecentDate);
    weekStart.setDate(mostRecentDate.getDate() - (weekNumber * 7) - 6);
    const weekEnd = new Date(mostRecentDate);
    weekEnd.setDate(mostRecentDate.getDate() - (weekNumber * 7));

    return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
  };

  // Helper function to get month key
  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Process data with grouping and aggregation
  const processedData = useMemo(() => {
    const groups: Record<string, unknown> = {};

    // Calculate most recent date for rolling periods
    let mostRecentDate: Date | null = null;
    if (state.timeAggregation === 'weekly' || state.timeAggregation === 'monthly') {
      const dates = filteredData
        .map(row => parseDateString(row.DATE))
        .filter((date): date is Date => date !== null);

      if (dates.length > 0) {
        mostRecentDate = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    // Group data based on grouping level and time aggregation
    filteredData.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const dateStr = row.DATE;
      const date = parseDateString(dateStr);

      if (!date) return;

      let groupKey = "";
      let timeKey = "";

      // Determine grouping key based on level
      switch (state.groupingLevel) {
        case "campaign":
          groupKey = campaignName;
          break;
        case "advertiser": {
          const advertiser = extractAdvertiserName(campaignName);
          const { agency } = extractAgencyInfo(campaignName);
          const normalizedAdvertiser = advertiser
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
          groupKey = `${normalizedAdvertiser} (${agency})`;
          break;
        }
        case "agency": {
          const agencyInfo = extractAgencyInfo(campaignName);
          groupKey = agencyInfo.agency;
          break;
        }
        case "date":
          groupKey = dateStr;
          break;
      }

      // Determine time key based on aggregation
      switch (state.timeAggregation) {
        case "daily":
          timeKey = dateStr;
          break;
        case "weekly":
          timeKey = getWeekKey(date, mostRecentDate);
          break;
        case "monthly":
          timeKey = getMonthKey(date);
          break;
        case "total":
          timeKey = "total";
          break;
      }

      const compositeKey = state.timeAggregation === "total" ? groupKey : `${groupKey}|${timeKey}`;

      if (!groups[compositeKey]) {
        groups[compositeKey] = {
          groupKey,
          timeKey,
          compositeKey,
          impressions: 0,
          clicks: 0,
          revenue: 0,
          spend: 0,
          transactions: 0,
          rowCount: 0
        };
      }

      const group = groups[compositeKey];
      group.impressions += parseFloat(row.IMPRESSIONS) || 0;
      group.clicks += parseFloat(row.CLICKS) || 0;
      group.revenue += parseFloat(row.REVENUE) || 0;
      group.spend += parseFloat(row.SPEND) || 0;
      group.transactions += parseFloat(row.TRANSACTIONS) || 0;
      group.rowCount += 1;
    });

    // Convert to array and calculate derived metrics
    interface GroupedData {
      groupKey: string;
      timeKey: string;
      compositeKey: string;
      impressions: number;
      clicks: number;
      revenue: number;
      spend: number;
      transactions: number;
      rowCount: number;
    }

    return Object.values(groups).map((group: GroupedData) => ({
      ...group,
      ctr: group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0,
      roas: group.spend > 0 ? group.revenue / group.spend : 0,
      cpm: group.impressions > 0 ? (group.spend / group.impressions) * 1000 : 0
    }));
  }, [filteredData, state.groupingLevel, state.timeAggregation, extractAdvertiserName, extractAgencyInfo]);

  // Sort processed data
  const sortedData = useMemo(() => {
    const sorted = [...processedData].sort((a, b) => {
      let aVal = a[state.sortColumn];
      let bVal = b[state.sortColumn];

      // Handle string sorting
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return state.sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Handle numeric sorting
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;

      return state.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [processedData, state.sortColumn, state.sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (state.page - 1) * state.rowsPerPage;
    const endIndex = startIndex + state.rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, state.page, state.rowsPerPage]);

  // Calculate comparison data if enabled
  const comparisonData = useMemo(() => {
    if (!state.showComparisons || state.timeAggregation === "total") return {};

    // Implementation for comparison calculations would go here
    // This is a simplified version - full implementation would calculate period-over-period changes
    return {};
  }, [state.showComparisons, state.timeAggregation]);

  // Actions
  const setGroupingLevel = (level: GroupingLevel) => {
    setState(prev => ({ ...prev, groupingLevel: level, page: 1 }));
  };

  const setTimeAggregation = (aggregation: TimeAggregation) => {
    setState(prev => ({
      ...prev,
      timeAggregation: aggregation,
      page: 1,
      showComparisons: aggregation !== "total" ? prev.showComparisons : false
    }));
  };

  const setShowComparisons = (show: boolean) => {
    setState(prev => ({ ...prev, showComparisons: show }));
  };

  const setPage = (page: number) => {
    setState(prev => ({ ...prev, page }));
  };

  const setRowsPerPage = (rows: number) => {
    setState(prev => ({ ...prev, rowsPerPage: rows, page: 1 }));
  };

  const setSortColumn = (column: string) => {
    setState(prev => ({ ...prev, sortColumn: column }));
  };

  const setSortDirection = (direction: "asc" | "desc") => {
    setState(prev => ({ ...prev, sortDirection: direction }));
  };

  const setIncludeAttributionOnly = (include: boolean) => {
    setState(prev => ({ ...prev, includeAttributionOnly: include, page: 1 }));
  };

  const handleSort = (column: string) => {
    if (state.sortColumn === column) {
      setSortDirection(state.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const exportToCSV = () => {
    const headers = [
      state.groupingLevel === "date" ? "Date" :
      state.groupingLevel === "campaign" ? "Campaign" :
      state.groupingLevel === "advertiser" ? "Advertiser" :
      "Agency",
      ...(state.timeAggregation !== "total" ? ["Time Period"] : []),
      "Impressions",
      "Clicks",
      "CTR (%)",
      "Revenue",
      "Spend",
      "ROAS",
      "CPM",
      "Transactions"
    ];

    const csvData = [
      headers.join(","),
      ...sortedData.map(row => [
        `"${row.groupKey}"`,
        ...(state.timeAggregation !== "total" ? [`"${row.timeKey}"`] : []),
        row.impressions.toLocaleString(),
        row.clicks.toLocaleString(),
        row.ctr.toFixed(2),
        `"$${row.revenue.toLocaleString()}"`,
        `"$${row.spend.toLocaleString()}"`,
        row.roas.toFixed(2),
        `"$${row.cpm.toFixed(2)}"`,
        row.transactions.toLocaleString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-data-${state.groupingLevel}-${state.timeAggregation}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const actions: DataTableActions = {
    setGroupingLevel,
    setTimeAggregation,
    setShowComparisons,
    setPage,
    setRowsPerPage,
    setSortColumn,
    setSortDirection,
    setIncludeAttributionOnly,
    handleSort,
    exportToCSV
  };

  return {
    state,
    actions,
    data: {
      processedData,
      sortedData,
      paginatedData,
      comparisonData,
      totalPages: Math.ceil(sortedData.length / state.rowsPerPage),
      totalRows: sortedData.length
    }
  };
};
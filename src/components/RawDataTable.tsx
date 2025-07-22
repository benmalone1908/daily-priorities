import { useState, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { normalizeDate } from "@/lib/utils";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

interface RawDataTableProps {
  data: any[];
  useGlobalFilters?: boolean;
  primaryDateRange?: any; // Temporarily use any instead of DateRange
}

const RawDataTable = ({ data, useGlobalFilters = false, primaryDateRange }: RawDataTableProps) => {
  const { isTestCampaign, extractAdvertiserName, extractAgencyInfo } = useCampaignFilter();
  const [view, setView] = useState<"daily" | "aggregate" | "advertiser" | "advertiser-by-day">("daily");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>("CAMPAIGN ORDER NAME");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [enableComparison, setEnableComparison] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState<any>(undefined); // Temporarily use any
  
  // Filter out 'Totals' rows and test campaigns
  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (row.DATE === 'Totals') return false;
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (!campaignName) return true;
      return !isTestCampaign(campaignName);
    });
  }, [data, isTestCampaign]);

  // Helper function to filter data by date range
  const filterDataByDateRange = (data: any[], dateRange?: any) => {
    if (!dateRange?.from || !dateRange?.to) return data;
    
    // Convert dates to YYYY-MM-DD format to match the data
    const fromStr = dateRange.from.toISOString().split('T')[0];
    const toStr = dateRange.to.toISOString().split('T')[0];
    
    console.log('Filtering data with date range:', { fromStr, toStr });
    console.log('Sample data dates:', data.slice(0, 3).map(row => ({ date: row.DATE, campaign: row["CAMPAIGN ORDER NAME"] })));
    
    const filtered = data.filter(row => {
      const rowDate = normalizeDate(row.DATE); // Use the existing normalizeDate function
      const result = rowDate >= fromStr && rowDate <= toStr;
      return result;
    });
    
    console.log(`Filtered ${filtered.length} rows from ${data.length} total rows`);
    return filtered;
  };

  // Helper function to process data for a specific date range
  const processDataForDateRange = (data: any[], suffix = '') => {
    if (view === "daily") {
      // In daily view, calculate CTR and ROAS for each row based on that day's metrics
      return data.map(row => {
        const impressions = Number(row.IMPRESSIONS) || 0;
        const clicks = Number(row.CLICKS) || 0;
        const revenue = Number(row.REVENUE) || 0;
        const spend = Number(row.SPEND) || 0;
        
        // Calculate CTR for this day
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        
        // Calculate ROAS for this day
        const roas = spend > 0 ? revenue / spend : 0;
        
        return {
          ...row,
          IMPRESSIONS: impressions,
          CLICKS: clicks,
          REVENUE: revenue,
          SPEND: spend,
          CTR: ctr,
          ROAS: roas,
          TRANSACTIONS: Number(row.TRANSACTIONS) || 0
        };
      });
    } else if (view === "aggregate") {
      // Aggregate view - group by campaign
      const campaignGroups: Record<string, any> = {};

      data.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"];
        
        if (!campaignGroups[campaignName]) {
          campaignGroups[campaignName] = {
            "CAMPAIGN ORDER NAME": campaignName,
            IMPRESSIONS: 0,
            CLICKS: 0,
            TRANSACTIONS: 0,
            REVENUE: 0,
            SPEND: 0,
            PERIOD: suffix || 'Current'
          };
        }
        
        campaignGroups[campaignName].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        campaignGroups[campaignName].CLICKS += Number(row.CLICKS) || 0;
        campaignGroups[campaignName].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
        campaignGroups[campaignName].REVENUE += Number(row.REVENUE) || 0;
        campaignGroups[campaignName].SPEND += Number(row.SPEND) || 0;
      });
      
      // Convert to array and calculate CTR and ROAS based on aggregated values
      return Object.values(campaignGroups).map(campaign => {
        const ctr = campaign.IMPRESSIONS > 0 
          ? (campaign.CLICKS / campaign.IMPRESSIONS) * 100 
          : 0;
          
        const roas = campaign.SPEND > 0 
          ? campaign.REVENUE / campaign.SPEND 
          : 0;
          
        return {
          ...campaign,
          CTR: ctr,
          ROAS: roas
        };
      });
    } else if (view === "advertiser-by-day") {
      // Advertiser by Day view - group by advertiser, agency, and date using centralized functions
      const advertiserDateGroups: Record<string, any> = {};

      data.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"];
        const advertiser = extractAdvertiserName(campaignName);
        const agencyInfo = extractAgencyInfo(campaignName);
        const agency = agencyInfo.agency;
        const date = row.DATE;
        const key = `${advertiser}|${agency}|${date}`;
        
        // Add console logging to identify problematic campaigns
        if (!advertiser || advertiser === "" || !agency || agency === "") {
          console.log('Advertiser-by-day: Campaign with missing info:', {
            campaignName,
            advertiser,
            agency: agencyInfo.agency,
            abbreviation: agencyInfo.abbreviation
          });
        }
        
        if (!advertiserDateGroups[key]) {
          advertiserDateGroups[key] = {
            "ADVERTISER": advertiser || "Unknown Advertiser",
            "AGENCY": agency || "Unknown Agency",
            "DATE": date,
            IMPRESSIONS: 0,
            CLICKS: 0,
            TRANSACTIONS: 0,
            REVENUE: 0,
            SPEND: 0,
            PERIOD: suffix || 'Current'
          };
        }
        
        advertiserDateGroups[key].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        advertiserDateGroups[key].CLICKS += Number(row.CLICKS) || 0;
        advertiserDateGroups[key].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
        advertiserDateGroups[key].REVENUE += Number(row.REVENUE) || 0;
        advertiserDateGroups[key].SPEND += Number(row.SPEND) || 0;
      });
      
      // Convert to array and calculate CTR and ROAS based on aggregated values
      return Object.values(advertiserDateGroups).map(advertiserDay => {
        const ctr = advertiserDay.IMPRESSIONS > 0 
          ? (advertiserDay.CLICKS / advertiserDay.IMPRESSIONS) * 100 
          : 0;
          
        const roas = advertiserDay.SPEND > 0 
          ? advertiserDay.REVENUE / advertiserDay.SPEND 
          : 0;
          
        return {
          ...advertiserDay,
          CTR: ctr,
          ROAS: roas
        };
      });
    } else {
      // Advertiser view - group by advertiser using centralized functions
      const advertiserGroups: Record<string, any> = {};

      data.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"];
        const advertiser = extractAdvertiserName(campaignName);
        const agencyInfo = extractAgencyInfo(campaignName);
        const agency = agencyInfo.agency;
        const key = `${advertiser}|${agency}`;
        
        // Add console logging to identify problematic campaigns
        if (!advertiser || advertiser === "" || !agency || agency === "") {
          console.log('Advertiser view: Campaign with missing info:', {
            campaignName,
            advertiser,
            agency: agencyInfo.agency,
            abbreviation: agencyInfo.abbreviation
          });
        }
        
        if (!advertiserGroups[key]) {
          advertiserGroups[key] = {
            "ADVERTISER": advertiser || "Unknown Advertiser",
            "AGENCY": agency || "Unknown Agency",
            IMPRESSIONS: 0,
            CLICKS: 0,
            TRANSACTIONS: 0,
            REVENUE: 0,
            SPEND: 0,
            PERIOD: suffix || 'Current'
          };
        }
        
        advertiserGroups[key].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        advertiserGroups[key].CLICKS += Number(row.CLICKS) || 0;
        advertiserGroups[key].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
        advertiserGroups[key].REVENUE += Number(row.REVENUE) || 0;
        advertiserGroups[key].SPEND += Number(row.SPEND) || 0;
      });
      
      // Convert to flat array with calculated CTR and ROAS
      const result = Object.values(advertiserGroups).map(advertiser => {
        const ctr = advertiser.IMPRESSIONS > 0 
          ? (advertiser.CLICKS / advertiser.IMPRESSIONS) * 100 
          : 0;
          
        const roas = advertiser.SPEND > 0 
          ? advertiser.REVENUE / advertiser.SPEND 
          : 0;
          
        return {
          ...advertiser,
          CTR: ctr,
          ROAS: roas
        };
      });
      
      return result;
    }
  };

  // Process data based on view type and comparison settings
  const processedData = useMemo(() => {
    // For daily view, comparison doesn't make sense, so just return regular data
    if (view === "daily") {
      return processDataForDateRange(filteredData);
    }

    // For aggregate and advertiser views, handle comparison if enabled
    if (enableComparison && comparisonDateRange?.from && comparisonDateRange?.to && (view === "aggregate" || view === "advertiser")) {
      // Filter data for primary period (using primaryDateRange if available, otherwise all data)
      const primaryData = primaryDateRange ? filterDataByDateRange(filteredData, primaryDateRange) : filteredData;
      const comparisonData = filterDataByDateRange(filteredData, comparisonDateRange);
      
      // Process both datasets
      const primaryProcessed = processDataForDateRange(primaryData, 'Primary');
      const comparisonProcessed = processDataForDateRange(comparisonData, 'Comparison');
      
      // Combine both datasets - each entity will appear twice
      const combined = [];
      
      if (view === "aggregate") {
        // For campaigns, match by campaign name
        const campaignMap = new Map();
        
        primaryProcessed.forEach(row => {
          const key = row["CAMPAIGN ORDER NAME"];
          if (!campaignMap.has(key)) {
            campaignMap.set(key, []);
          }
          campaignMap.get(key).push({ ...row, PERIOD: 'Primary' });
        });
        
        comparisonProcessed.forEach(row => {
          const key = row["CAMPAIGN ORDER NAME"];
          if (!campaignMap.has(key)) {
            campaignMap.set(key, []);
          }
          campaignMap.get(key).push({ ...row, PERIOD: 'Comparison' });
        });
        
        // Flatten the map and ensure both periods exist for each campaign
        campaignMap.forEach((periods, campaignName) => {
          const primaryPeriod = periods.find(p => p.PERIOD === 'Primary');
          const comparisonPeriod = periods.find(p => p.PERIOD === 'Comparison');
          
          if (primaryPeriod) {
            combined.push(primaryPeriod);
          }
          if (comparisonPeriod) {
            combined.push(comparisonPeriod);
          }
          
          // If only one period exists, create a zero-value row for the missing period
          if (primaryPeriod && !comparisonPeriod) {
            combined.push({
              "CAMPAIGN ORDER NAME": campaignName,
              IMPRESSIONS: 0,
              CLICKS: 0,
              TRANSACTIONS: 0,
              REVENUE: 0,
              SPEND: 0,
              CTR: 0,
              ROAS: 0,
              PERIOD: 'Comparison'
            });
          } else if (comparisonPeriod && !primaryPeriod) {
            combined.push({
              "CAMPAIGN ORDER NAME": campaignName,
              IMPRESSIONS: 0,
              CLICKS: 0,
              TRANSACTIONS: 0,
              REVENUE: 0,
              SPEND: 0,
              CTR: 0,
              ROAS: 0,
              PERIOD: 'Primary'
            });
          }
        });
      } else if (view === "advertiser") {
        // For advertisers, match by advertiser + agency
        const advertiserMap = new Map();
        
        primaryProcessed.forEach(row => {
          const key = `${row.ADVERTISER}|${row.AGENCY}`;
          if (!advertiserMap.has(key)) {
            advertiserMap.set(key, []);
          }
          advertiserMap.get(key).push({ ...row, PERIOD: 'Primary' });
        });
        
        comparisonProcessed.forEach(row => {
          const key = `${row.ADVERTISER}|${row.AGENCY}`;
          if (!advertiserMap.has(key)) {
            advertiserMap.set(key, []);
          }
          advertiserMap.get(key).push({ ...row, PERIOD: 'Comparison' });
        });
        
        // Flatten the map and ensure both periods exist for each advertiser
        advertiserMap.forEach((periods, key) => {
          const [advertiser, agency] = key.split('|');
          const primaryPeriod = periods.find(p => p.PERIOD === 'Primary');
          const comparisonPeriod = periods.find(p => p.PERIOD === 'Comparison');
          
          if (primaryPeriod) {
            combined.push(primaryPeriod);
          }
          if (comparisonPeriod) {
            combined.push(comparisonPeriod);
          }
          
          // If only one period exists, create a zero-value row for the missing period
          if (primaryPeriod && !comparisonPeriod) {
            combined.push({
              ADVERTISER: advertiser,
              AGENCY: agency,
              IMPRESSIONS: 0,
              CLICKS: 0,
              TRANSACTIONS: 0,
              REVENUE: 0,
              SPEND: 0,
              CTR: 0,
              ROAS: 0,
              PERIOD: 'Comparison'
            });
          } else if (comparisonPeriod && !primaryPeriod) {
            combined.push({
              ADVERTISER: advertiser,
              AGENCY: agency,
              IMPRESSIONS: 0,
              CLICKS: 0,
              TRANSACTIONS: 0,
              REVENUE: 0,
              SPEND: 0,
              CTR: 0,
              ROAS: 0,
              PERIOD: 'Primary'
            });
          }
        });
      }
      
      return combined;
    } else {
      // No comparison, return regular processed data
      return processDataForDateRange(filteredData);
    }
  }, [filteredData, view, extractAdvertiserName, extractAgencyInfo, enableComparison, comparisonDateRange, primaryDateRange]);
  
  // Sort function with primary and secondary sorting
  const sortedData = useMemo(() => {
    if (!processedData) return [];
    
    return [...processedData].sort((a, b) => {
      // Primary sort by selected column
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (sortDirection === 'asc') {
          if (aValue !== bValue) return aValue - bValue;
        } else {
          if (aValue !== bValue) return bValue - aValue;
        }
      } 
      // Handle string values
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortDirection === 'asc') {
          if (aValue !== bValue) return aValue.localeCompare(bValue);
        } else {
          if (aValue !== bValue) return bValue.localeCompare(aValue);
        }
      }
      
      // Secondary sort based on view type
      if (view === "advertiser") {
        // For advertiser view, secondary sort by advertiser then agency
        if (sortColumn !== "ADVERTISER") {
          const aAdvertiser = a["ADVERTISER"];
          const bAdvertiser = b["ADVERTISER"];
          if (aAdvertiser !== bAdvertiser) return aAdvertiser.localeCompare(bAdvertiser);
          const aAgency = a["AGENCY"];
          const bAgency = b["AGENCY"];
          return aAgency.localeCompare(bAgency);
        }
      } else if (view === "advertiser-by-day") {
        // For advertiser-by-day view, secondary sort by advertiser, then agency, then date
        if (sortColumn !== "ADVERTISER") {
          const aAdvertiser = a["ADVERTISER"];
          const bAdvertiser = b["ADVERTISER"];
          if (aAdvertiser !== bAdvertiser) return aAdvertiser.localeCompare(bAdvertiser);
          const aAgency = a["AGENCY"];
          const bAgency = b["AGENCY"];
          if (aAgency !== bAgency) return aAgency.localeCompare(bAgency);
          const aDate = a["DATE"];
          const bDate = b["DATE"];
          return aDate.localeCompare(bDate);
        }
      } else if (sortColumn !== "CAMPAIGN ORDER NAME") {
        const aCampaign = a["CAMPAIGN ORDER NAME"];
        const bCampaign = b["CAMPAIGN ORDER NAME"];
        return aCampaign.localeCompare(bCampaign);
      }
      
      return 0;
    });
  }, [processedData, sortColumn, sortDirection, view]);

  // Paginate the data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);
  
  // Total number of pages based on selected rows per page
  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / rowsPerPage);
  }, [sortedData, rowsPerPage]);

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sort changes
  };
  
  // Handle view change
  const handleViewChange = (newView: "daily" | "aggregate" | "advertiser" | "advertiser-by-day") => {
    setView(newView);
    setPage(1); // Reset to first page when view changes
    
    // If switching views, keep the same sort column if it exists in both views
    if (newView === 'aggregate' && sortColumn === 'DATE') {
      setSortColumn("CAMPAIGN ORDER NAME");
    } else if ((newView === 'advertiser' || newView === 'advertiser-by-day') && (sortColumn === 'DATE' || sortColumn === 'CAMPAIGN ORDER NAME')) {
      setSortColumn("ADVERTISER");
    } else if ((newView === 'daily' || newView === 'aggregate') && (sortColumn === 'ADVERTISER' || sortColumn === 'AGENCY')) {
      setSortColumn("CAMPAIGN ORDER NAME");
    }
  };
  
  // Generate and download CSV
  const exportToCsv = () => {
    try {
      // Get all data (not just current page)
      const csvData = sortedData;
      
      // Define columns based on view type
      let columns: string[];
      if (view === 'daily') {
        columns = ['CAMPAIGN ORDER NAME', 'DATE', 'IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS'];
      } else if (view === 'advertiser') {
        columns = ['ADVERTISER', 'AGENCY'];
        if (enableComparison) columns.push('PERIOD');
        columns.push(...['IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS']);
      } else if (view === 'advertiser-by-day') {
        columns = ['ADVERTISER', 'AGENCY', 'DATE', 'IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS'];
      } else {
        // aggregate view
        columns = ['CAMPAIGN ORDER NAME'];
        if (enableComparison) columns.push('PERIOD');
        columns.push(...['IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS']);
      }
      
      // Generate CSV header row
      let csv = columns.join(',') + '\n';
      
      // Generate CSV data rows
      csvData.forEach(row => {
        const csvRow = columns.map(column => {
          const value = row[column];
          
          // Format values appropriately
          if (column === 'CTR') {
            return typeof value === 'number' ? `${value.toFixed(3)}%` : '0.000%';
          } else if (column === 'ROAS') {
            return typeof value === 'number' ? `${value.toFixed(1)}x` : '0.0x';
          } else if (column === 'REVENUE' || column === 'SPEND') {
            return typeof value === 'number' ? `$${value.toFixed(2)}` : '$0.00';
          } else if (typeof value === 'number') {
            return value.toString();
          } else if (typeof value === 'string' && value.includes(',')) {
            // Escape strings containing commas with quotes
            return `"${value}"`;
          }
          return value || '';
        }).join(',');
        
        csv += csvRow + '\n';
      });
      
      // Create downloadable blob
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and click it
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campaign-data-${view}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };
  
  // Format value based on column type
  const formatColumnValue = (row: any, column: string) => {
    if (!row) return '';
    
    const value = row[column];
    
    switch (column) {
      case 'DATE':
        return value || 'N/A';
      case 'CTR':
        return `${typeof value === 'number' ? value.toFixed(3) : '0.000'}%`;
      case 'ROAS':
        return `${typeof value === 'number' ? value.toFixed(1) : '0.0'}x`;
      case 'REVENUE':
      case 'SPEND':
        return `$${typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
      case 'IMPRESSIONS':
      case 'CLICKS':
      case 'TRANSACTIONS':
        return typeof value === 'number' ? value.toLocaleString('en-US') : '0';
      default:
        return value || '';
    }
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    
    // Show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink 
          onClick={() => setPage(1)} 
          isActive={page === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );
    
    // Add ellipsis if needed
    if (page > 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Add pages around current page
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      if (i <= totalPages && i >= 2) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              onClick={() => setPage(i)} 
              isActive={page === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }
    
    // Add ellipsis if needed
    if (page < totalPages - 2 && totalPages > 4) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Show last page if it's not the only page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink 
            onClick={() => setPage(totalPages)} 
            isActive={page === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => handleViewChange("daily")}
            variant={view === "daily" ? "default" : "outline"}
            size="sm"
          >
            Daily View
          </Button>
          <Button 
            onClick={() => handleViewChange("aggregate")}
            variant={view === "aggregate" ? "default" : "outline"}
            size="sm"
          >
            Aggregate View
          </Button>
          <Button 
            onClick={() => handleViewChange("advertiser")}
            variant={view === "advertiser" ? "default" : "outline"}
            size="sm"
          >
            Advertiser View
          </Button>
          <Button 
            onClick={() => handleViewChange("advertiser-by-day")}
            variant={view === "advertiser-by-day" ? "default" : "outline"}
            size="sm"
          >
            Advertiser by Day
          </Button>
          
          <Button
            onClick={exportToCsv}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span>Rows per page:</span>
          <Select 
            value={rowsPerPage.toString()} 
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setPage(1); // Reset to first page when changing rows per page
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Comparison Controls - Temporarily disabled to fix React error */}
      {false && (view === "aggregate" || view === "advertiser") && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enable-comparison"
              checked={enableComparison}
              onChange={(e) => {
                setEnableComparison(e.target.checked);
                if (!e.target.checked) {
                  setComparisonDateRange(undefined);
                }
                setPage(1);
              }}
            />
            <label htmlFor="enable-comparison" className="text-sm font-medium">
              Compare date ranges
            </label>
          </div>
          
          {enableComparison && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Select comparison date range:
              </label>
              <div className="text-sm text-muted-foreground">
                Date picker temporarily disabled
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="w-full overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="text-xs">
              {view === "advertiser" ? (
                <>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 w-[15%]"
                    onClick={() => handleSort("ADVERTISER")}
                  >
                    Advertiser
                    {sortColumn === "ADVERTISER" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 w-[15%]"
                    onClick={() => handleSort("AGENCY")}
                  >
                    Agency
                    {sortColumn === "AGENCY" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                </>
              ) : view === "advertiser-by-day" ? (
                <>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 w-[15%]"
                    onClick={() => handleSort("ADVERTISER")}
                  >
                    Advertiser
                    {sortColumn === "ADVERTISER" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 w-[15%]"
                    onClick={() => handleSort("AGENCY")}
                  >
                    Agency
                    {sortColumn === "AGENCY" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 text-right w-[8%]"
                    onClick={() => handleSort("DATE")}
                  >
                    Date
                    {sortColumn === "DATE" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                </>
              ) : (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 py-1 px-3"
                  style={{ width: view === "daily" ? '30%' : '35%' }}
                  onClick={() => handleSort("CAMPAIGN ORDER NAME")}
                >
                  Campaign Name
                  {sortColumn === "CAMPAIGN ORDER NAME" && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
              )}
              
              {view === "daily" && (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 py-1 px-3 text-right w-[10%]"
                  onClick={() => handleSort("DATE")}
                >
                  Date
                  {sortColumn === "DATE" && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
              )}
              
              {enableComparison && (view === "aggregate" || view === "advertiser") && (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 py-1 px-3 text-center w-[8%]"
                  onClick={() => handleSort("PERIOD")}
                >
                  Period
                  {sortColumn === "PERIOD" && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
              )}
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3"
                style={{ width: (view === "advertiser" || view === "advertiser-by-day") ? '12%' : '10%' }}
                onClick={() => handleSort("IMPRESSIONS")}
              >
                Impressions
                {sortColumn === "IMPRESSIONS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3"
                style={{ width: (view === "advertiser" || view === "advertiser-by-day") ? '10%' : '8%' }}
                onClick={() => handleSort("CLICKS")}
              >
                Clicks
                {sortColumn === "CLICKS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3"
                style={{ width: (view === "advertiser" || view === "advertiser-by-day") ? '10%' : '8%' }}
                onClick={() => handleSort("CTR")}
              >
                CTR
                {sortColumn === "CTR" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3"
                style={{ width: (view === "advertiser" || view === "advertiser-by-day") ? '10%' : '8%' }}
                onClick={() => handleSort("TRANSACTIONS")}
              >
                Transactions
                {sortColumn === "TRANSACTIONS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3"
                style={{ width: (view === "advertiser" || view === "advertiser-by-day") ? '12%' : '10%' }}
                onClick={() => handleSort("REVENUE")}
              >
                Revenue
                {sortColumn === "REVENUE" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3"
                style={{ width: (view === "advertiser" || view === "advertiser-by-day") ? '12%' : '10%' }}
                onClick={() => handleSort("SPEND")}
              >
                Spend
                {sortColumn === "SPEND" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3"
                style={{ width: (view === "advertiser" || view === "advertiser-by-day") ? '10%' : '8%' }}
                onClick={() => handleSort("ROAS")}
              >
                ROAS
                {sortColumn === "ROAS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view === "advertiser" ? (
              paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow key={`${row.ADVERTISER}-${row.AGENCY}-${row.PERIOD || 'current'}-${index}`} className="text-xs">
                    <TableCell className="font-medium py-1 px-3 truncate" title={row.ADVERTISER}>
                      {row.ADVERTISER}
                    </TableCell>
                    <TableCell className="py-1 px-3 truncate" title={row.AGENCY}>
                      {row.AGENCY}
                    </TableCell>
                    {enableComparison && (
                      <TableCell className="text-center py-1 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${row.PERIOD === 'Primary' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                          {row.PERIOD || 'Current'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "IMPRESSIONS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "CLICKS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "CTR")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "TRANSACTIONS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "REVENUE")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "SPEND")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "ROAS")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={enableComparison ? 10 : 9} className="text-center py-1">
                    No data available
                  </TableCell>
                </TableRow>
              )
            ) : view === "advertiser-by-day" ? (
              paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow key={`${row.ADVERTISER}-${row.AGENCY}-${row.DATE}-${index}`} className="text-xs">
                    <TableCell className="font-medium py-1 px-3 truncate" title={row.ADVERTISER}>
                      {row.ADVERTISER}
                    </TableCell>
                    <TableCell className="py-1 px-3 truncate" title={row.AGENCY}>
                      {row.AGENCY}
                    </TableCell>
                    <TableCell className="py-1 px-3 text-right">{formatColumnValue(row, "DATE")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "IMPRESSIONS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "CLICKS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "CTR")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "TRANSACTIONS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "REVENUE")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "SPEND")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "ROAS")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-1">
                    No data available
                  </TableCell>
                </TableRow>
              )
            ) : (
              paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow key={`${row["CAMPAIGN ORDER NAME"]}-${row.PERIOD || 'current'}-${row.DATE || index}`} className="text-xs">
                    <TableCell className="font-medium py-1 px-3 truncate" title={row["CAMPAIGN ORDER NAME"]}>
                      {row["CAMPAIGN ORDER NAME"]}
                    </TableCell>
                    
                    {view === "daily" && (
                      <TableCell className="py-1 px-3 text-right">{formatColumnValue(row, "DATE")}</TableCell>
                    )}
                    
                    {enableComparison && view === "aggregate" && (
                      <TableCell className="text-center py-1 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${row.PERIOD === 'Primary' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                          {row.PERIOD || 'Current'}
                        </span>
                      </TableCell>
                    )}
                    
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "IMPRESSIONS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "CLICKS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "CTR")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "TRANSACTIONS")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "REVENUE")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "SPEND")}</TableCell>
                    <TableCell className="text-right py-1 px-3">{formatColumnValue(row, "ROAS")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={view === "daily" ? 9 : (enableComparison && view === "aggregate" ? 9 : 8)} className="text-center py-1">
                    No data available
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="mx-auto flex justify-center">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setPage(page > 1 ? page - 1 : 1)}
                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            
            {renderPaginationItems()}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      
      <div className="text-sm text-muted-foreground text-center">
        Showing {paginatedData.length} of {sortedData.length} results
      </div>
    </div>
  );
};

export default RawDataTable;

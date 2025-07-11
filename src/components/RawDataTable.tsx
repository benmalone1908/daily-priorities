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
}

const RawDataTable = ({ data, useGlobalFilters = false }: RawDataTableProps) => {
  const { isTestCampaign } = useCampaignFilter();
  const [view, setView] = useState<"daily" | "aggregate" | "advertiser" | "advertiser-by-day">("daily");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>("CAMPAIGN ORDER NAME");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Filter out 'Totals' rows and test campaigns
  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (row.DATE === 'Totals') return false;
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (!campaignName) return true;
      return !isTestCampaign(campaignName);
    });
  }, [data, isTestCampaign]);

  // Extract agency from campaign name (improved version)
  const extractAgencyFromCampaign = (campaignName: string) => {
    console.log('Campaign name for agency extraction:', campaignName);
    const match = campaignName.match(/:\s*([A-Z]+):/);
    if (match) {
      const abbreviation = match[1];
      // Map abbreviations to full names - Updated to include OG and SM rebrand
      const agencyMap: Record<string, string> = {
        'MJ': 'MediaJel',
        '2RS': 'Two Rivers',
        'SM': 'Orangellow',
        'NP': 'Noble People',
        'OG': 'Orangellow',
        'TF': 'Tact Firm',
        'TRN': 'Terrayn',
        'BLO': 'Be Local One',
        'HRB': 'Herb.co',
        'WWX': 'Wunderworx',
        'NLMC': 'NLMC',
      };
      const result = agencyMap[abbreviation] || abbreviation;
      console.log('Extracted agency:', result, 'from abbreviation:', abbreviation);
      return result;
    }
    console.log('No agency match found, returning Unknown Agency');
    return 'Unknown Agency';
  };

  // Extract advertiser from campaign name (improved version)
  const extractAdvertiserFromCampaign = (campaignName: string) => {
    console.log('Campaign name for advertiser extraction:', campaignName);
    // Extract the part after the second colon
    const parts = campaignName.split(':');
    if (parts.length >= 3) {
      let advertiserPart = parts[2].trim();
      
      // Remove common prefixes and suffixes
      advertiserPart = advertiserPart.replace(/^(PPC|SEM|SEO|Social|Display|Video|Search|Shopping)\s*[-_]\s*/i, '');
      
      // Extract the advertiser name (before the first dash, underscore, or common separators)
      const advertiserMatch = advertiserPart.match(/^([^-_|]+)/);
      let result = advertiserMatch ? advertiserMatch[1].trim() : advertiserPart;
      
      // Clean up common suffixes
      result = result.replace(/\s+(Campaign|Campaigns|Ads?|Marketing|Promo|Promotion)$/i, '');
      
      console.log('Extracted advertiser:', result, 'from part:', advertiserPart);
      return result;
    }
    console.log('No advertiser match found, returning Unknown Advertiser');
    return 'Unknown Advertiser';
  };

  // Process data based on view type
  const processedData = useMemo(() => {
    if (view === "daily") {
      // In daily view, calculate CTR and ROAS for each row based on that day's metrics
      return filteredData.map(row => {
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

      filteredData.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"];
        
        if (!campaignGroups[campaignName]) {
          campaignGroups[campaignName] = {
            "CAMPAIGN ORDER NAME": campaignName,
            IMPRESSIONS: 0,
            CLICKS: 0,
            TRANSACTIONS: 0,
            REVENUE: 0,
            SPEND: 0
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
      // Advertiser by Day view - group by advertiser and date
      const advertiserDateGroups: Record<string, any> = {};

      filteredData.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"];
        const advertiser = extractAdvertiserFromCampaign(campaignName);
        const date = row.DATE;
        const key = `${advertiser}|${date}`;
        
        if (!advertiserDateGroups[key]) {
          advertiserDateGroups[key] = {
            "ADVERTISER": advertiser,
            "DATE": date,
            IMPRESSIONS: 0,
            CLICKS: 0,
            TRANSACTIONS: 0,
            REVENUE: 0,
            SPEND: 0
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
      // Advertiser view - group by advertiser, create flat list
      const advertiserGroups: Record<string, any> = {};

      filteredData.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"];
        const agency = extractAgencyFromCampaign(campaignName);
        const advertiser = extractAdvertiserFromCampaign(campaignName);
        const key = `${advertiser}|${agency}`;
        
        console.log('Processing row - Campaign:', campaignName, 'Agency:', agency, 'Advertiser:', advertiser);
        
        if (!advertiserGroups[key]) {
          advertiserGroups[key] = {
            "ADVERTISER": advertiser,
            "AGENCY": agency,
            IMPRESSIONS: 0,
            CLICKS: 0,
            TRANSACTIONS: 0,
            REVENUE: 0,
            SPEND: 0
          };
        }
        
        advertiserGroups[key].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        advertiserGroups[key].CLICKS += Number(row.CLICKS) || 0;
        advertiserGroups[key].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
        advertiserGroups[key].REVENUE += Number(row.REVENUE) || 0;
        advertiserGroups[key].SPEND += Number(row.SPEND) || 0;
      });
      
      console.log('Advertiser groups structure:', advertiserGroups);
      
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
      
      console.log('Final result for advertiser view:', result);
      return result;
    }
  }, [filteredData, view]);
  
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
        // For advertiser-by-day view, secondary sort by advertiser then date
        if (sortColumn !== "ADVERTISER") {
          const aAdvertiser = a["ADVERTISER"];
          const bAdvertiser = b["ADVERTISER"];
          if (aAdvertiser !== bAdvertiser) return aAdvertiser.localeCompare(bAdvertiser);
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
    } else if (newView === 'advertiser' && (sortColumn === 'DATE' || sortColumn === 'CAMPAIGN ORDER NAME')) {
      setSortColumn("ADVERTISER");
    } else if (newView === 'advertiser-by-day' && sortColumn === 'CAMPAIGN ORDER NAME') {
      setSortColumn("ADVERTISER");
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
        columns = ['ADVERTISER', 'AGENCY', 'IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS'];
      } else if (view === 'advertiser-by-day') {
        columns = ['ADVERTISER', 'DATE', 'IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS'];
      } else {
        // aggregate view
        columns = ['CAMPAIGN ORDER NAME', 'IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS'];
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
      
      <div className="w-full overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="text-xs">
              {view === "advertiser" ? (
                <>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 w-1/4"
                    onClick={() => handleSort("ADVERTISER")}
                  >
                    Advertiser
                    {sortColumn === "ADVERTISER" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 w-1/4"
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
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 w-1/4"
                    onClick={() => handleSort("ADVERTISER")}
                  >
                    Advertiser
                    {sortColumn === "ADVERTISER" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-3 text-right w-[10%]"
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
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3"
                style={{ width: view === "advertiser" || view === "advertiser-by-day" ? '8%' : '10%' }}
                onClick={() => handleSort("IMPRESSIONS")}
              >
                Impressions
                {sortColumn === "IMPRESSIONS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3 w-[8%]"
                onClick={() => handleSort("CLICKS")}
              >
                Clicks
                {sortColumn === "CLICKS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3 w-[8%]"
                onClick={() => handleSort("CTR")}
              >
                CTR
                {sortColumn === "CTR" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3 w-[8%]"
                onClick={() => handleSort("TRANSACTIONS")}
              >
                Transactions
                {sortColumn === "TRANSACTIONS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3 w-[10%]"
                onClick={() => handleSort("REVENUE")}
              >
                Revenue
                {sortColumn === "REVENUE" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3 w-[10%]"
                onClick={() => handleSort("SPEND")}
              >
                Spend
                {sortColumn === "SPEND" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-3 w-[8%]"
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
                  <TableRow key={`${row.ADVERTISER}-${row.AGENCY}-${index}`} className="text-xs">
                    <TableCell className="font-medium py-1 px-3 truncate" title={row.ADVERTISER}>
                      {row.ADVERTISER}
                    </TableCell>
                    <TableCell className="py-1 px-3 truncate" title={row.AGENCY}>
                      {row.AGENCY}
                    </TableCell>
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
                  <TableCell colSpan={9} className="text-center py-1">
                    No data available
                  </TableCell>
                </TableRow>
              )
            ) : view === "advertiser-by-day" ? (
              paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow key={`${row.ADVERTISER}-${row.DATE}-${index}`} className="text-xs">
                    <TableCell className="font-medium py-1 px-3 truncate" title={row.ADVERTISER}>
                      {row.ADVERTISER}
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
                  <TableCell colSpan={9} className="text-center py-1">
                    No data available
                  </TableCell>
                </TableRow>
              )
            ) : (
              paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow key={`${row["CAMPAIGN ORDER NAME"]}-${row.DATE || index}`} className="text-xs">
                    <TableCell className="font-medium py-1 px-3 truncate" title={row["CAMPAIGN ORDER NAME"]}>
                      {row["CAMPAIGN ORDER NAME"]}
                    </TableCell>
                    
                    {view === "daily" && (
                      <TableCell className="py-1 px-3 text-right">{formatColumnValue(row, "DATE")}</TableCell>
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
                  <TableCell colSpan={view === "daily" ? 9 : 8} className="text-center py-1">
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

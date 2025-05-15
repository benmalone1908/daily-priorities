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
import { normalizeDate, formatNumber } from "@/lib/utils";

interface RawDataTableProps {
  data: any[];
  useGlobalFilters?: boolean;
}

const RawDataTable = ({ data, useGlobalFilters = false }: RawDataTableProps) => {
  const [view, setView] = useState<"daily" | "aggregate">("daily");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>("CAMPAIGN ORDER NAME");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Filter out 'Totals' rows since we're creating our own aggregations
  const filteredData = useMemo(() => {
    return data.filter(row => row.DATE !== 'Totals');
  }, [data]);

  // Process data based on view type
  const processedData = useMemo(() => {
    if (view === "daily") {
      return filteredData;
    } else {
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
      
      // Secondary sort by Campaign Name if primary sort values are equal
      if (sortColumn !== "CAMPAIGN ORDER NAME") {
        const aCampaign = a["CAMPAIGN ORDER NAME"];
        const bCampaign = b["CAMPAIGN ORDER NAME"];
        return aCampaign.localeCompare(bCampaign);
      }
      
      return 0;
    });
  }, [processedData, sortColumn, sortDirection]);

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
  const handleViewChange = (newView: "daily" | "aggregate") => {
    setView(newView);
    setPage(1); // Reset to first page when view changes
    
    // If switching views, keep the same sort column if it exists in both views
    if (newView === 'aggregate' && sortColumn === 'DATE') {
      setSortColumn("CAMPAIGN ORDER NAME");
    }
  };
  
  // Generate and download CSV
  const exportToCsv = () => {
    try {
      // Get all data (not just current page)
      const csvData = sortedData;
      
      // Define columns based on view type
      const columns = view === 'daily' 
        ? ['CAMPAIGN ORDER NAME', 'DATE', 'IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS']
        : ['CAMPAIGN ORDER NAME', 'IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS'];
      
      // Generate CSV header row
      let csv = columns.join(',') + '\n';
      
      // Generate CSV data rows
      csvData.forEach(row => {
        const csvRow = columns.map(column => {
          const value = row[column];
          
          // Format values appropriately
          if (column === 'CTR') {
            return typeof value === 'number' ? `${value.toFixed(2)}%` : '0%';
          } else if (column === 'ROAS') {
            return typeof value === 'number' ? value.toFixed(2) : '0';
          } else if (column === 'REVENUE' || column === 'SPEND') {
            return typeof value === 'number' ? `$${value.toFixed(2)}` : '$0';
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
        return `${typeof value === 'number' ? value.toFixed(2) : '0'}%`;
      case 'ROAS':
        return typeof value === 'number' ? value.toFixed(2) : '0';
      case 'REVENUE':
      case 'SPEND':
        return `$${typeof value === 'number' ? value.toFixed(2) : '0'}`;
      case 'IMPRESSIONS':
      case 'CLICKS':
      case 'TRANSACTIONS':
        return typeof value === 'number' ? formatNumber(value) : '0';
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
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("CAMPAIGN ORDER NAME")}
              >
                Campaign Name
                {sortColumn === "CAMPAIGN ORDER NAME" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              {view === "daily" && (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("DATE")}
                >
                  Date
                  {sortColumn === "DATE" && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
              )}
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("IMPRESSIONS")}
              >
                Impressions
                {sortColumn === "IMPRESSIONS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("CLICKS")}
              >
                Clicks
                {sortColumn === "CLICKS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("CTR")}
              >
                CTR
                {sortColumn === "CTR" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("TRANSACTIONS")}
              >
                Transactions
                {sortColumn === "TRANSACTIONS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("REVENUE")}
              >
                Revenue
                {sortColumn === "REVENUE" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("SPEND")}
              >
                Spend
                {sortColumn === "SPEND" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
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
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <TableRow key={`${row["CAMPAIGN ORDER NAME"]}-${row.DATE || index}`}>
                  <TableCell className="font-medium truncate max-w-[200px]" title={row["CAMPAIGN ORDER NAME"]}>
                    {row["CAMPAIGN ORDER NAME"]}
                  </TableCell>
                  
                  {view === "daily" && (
                    <TableCell>{formatColumnValue(row, "DATE")}</TableCell>
                  )}
                  
                  <TableCell className="text-right">{formatColumnValue(row, "IMPRESSIONS")}</TableCell>
                  <TableCell className="text-right">{formatColumnValue(row, "CLICKS")}</TableCell>
                  <TableCell className="text-right">{formatColumnValue(row, "CTR")}</TableCell>
                  <TableCell className="text-right">{formatColumnValue(row, "TRANSACTIONS")}</TableCell>
                  <TableCell className="text-right">{formatColumnValue(row, "REVENUE")}</TableCell>
                  <TableCell className="text-right">{formatColumnValue(row, "SPEND")}</TableCell>
                  <TableCell className="text-right">{formatColumnValue(row, "ROAS")}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={view === "daily" ? 9 : 8} className="text-center py-4">
                  No data available
                </TableCell>
              </TableRow>
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

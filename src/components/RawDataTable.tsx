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
import { FileDown, ChevronDown, ChevronRight } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { normalizeDate } from "@/lib/utils";

interface RawDataTableProps {
  data: any[];
  useGlobalFilters?: boolean;
}

const RawDataTable = ({ data, useGlobalFilters = false }: RawDataTableProps) => {
  const [view, setView] = useState<"daily" | "aggregate" | "advertiser">("daily");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>("CAMPAIGN ORDER NAME");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  
  // Filter out 'Totals' rows since we're creating our own aggregations
  const filteredData = useMemo(() => {
    return data.filter(row => row.DATE !== 'Totals');
  }, [data]);

  // Extract agency from campaign name (simplified version)
  const extractAgencyFromCampaign = (campaignName: string) => {
    const match = campaignName.match(/:\s*([A-Z]+):/);
    if (match) {
      const abbreviation = match[1];
      // Map abbreviations to full names
      const agencyMap: Record<string, string> = {
        'MJ': 'MediaJel',
        '2RS': 'Two Rivers',
        'SM': 'SM Services',
        'NP': 'Noble People',
        'TF': 'Tact Firm',
        'TRN': 'Terrayn',
        'BLO': 'Be Local One',
        'HRB': 'Herb.co',
        'WWX': 'Wunderworx',
        'NLMC': 'NLMC',
      };
      return agencyMap[abbreviation] || abbreviation;
    }
    return 'Unknown Agency';
  };

  // Extract advertiser from campaign name (simplified version)
  const extractAdvertiserFromCampaign = (campaignName: string) => {
    // Extract the part after the second colon
    const parts = campaignName.split(':');
    if (parts.length >= 3) {
      const advertiserPart = parts[2].trim();
      // Extract the advertiser name (before the first dash)
      const advertiserMatch = advertiserPart.match(/^([^-]+)/);
      return advertiserMatch ? advertiserMatch[1].trim() : advertiserPart;
    }
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
    } else {
      // Advertiser view - group by agency then advertiser
      const agencyGroups: Record<string, Record<string, any>> = {};

      filteredData.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"];
        const agency = extractAgencyFromCampaign(campaignName);
        const advertiser = extractAdvertiserFromCampaign(campaignName);
        
        if (!agencyGroups[agency]) {
          agencyGroups[agency] = {};
        }
        
        if (!agencyGroups[agency][advertiser]) {
          agencyGroups[agency][advertiser] = {
            "AGENCY": agency,
            "ADVERTISER": advertiser,
            IMPRESSIONS: 0,
            CLICKS: 0,
            TRANSACTIONS: 0,
            REVENUE: 0,
            SPEND: 0
          };
        }
        
        agencyGroups[agency][advertiser].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        agencyGroups[agency][advertiser].CLICKS += Number(row.CLICKS) || 0;
        agencyGroups[agency][advertiser].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
        agencyGroups[agency][advertiser].REVENUE += Number(row.REVENUE) || 0;
        agencyGroups[agency][advertiser].SPEND += Number(row.SPEND) || 0;
      });
      
      // Convert to flat array with agency and advertiser info
      const result: any[] = [];
      Object.entries(agencyGroups).forEach(([agency, advertisers]) => {
        Object.values(advertisers).forEach(advertiser => {
          const ctr = advertiser.IMPRESSIONS > 0 
            ? (advertiser.CLICKS / advertiser.IMPRESSIONS) * 100 
            : 0;
            
          const roas = advertiser.SPEND > 0 
            ? advertiser.REVENUE / advertiser.SPEND 
            : 0;
            
          result.push({
            ...advertiser,
            CTR: ctr,
            ROAS: roas
          });
        });
      });
      
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
      
      // Secondary sort by Campaign Name if primary sort values are equal
      if (view === "advertiser") {
        // For advertiser view, secondary sort by agency then advertiser
        if (sortColumn !== "AGENCY") {
          const aAgency = a["AGENCY"];
          const bAgency = b["AGENCY"];
          if (aAgency !== bAgency) return aAgency.localeCompare(bAgency);
          const aAdvertiser = a["ADVERTISER"];
          const bAdvertiser = b["ADVERTISER"];
          return aAdvertiser.localeCompare(bAdvertiser);
        }
      } else if (sortColumn !== "CAMPAIGN ORDER NAME") {
        const aCampaign = a["CAMPAIGN ORDER NAME"];
        const bCampaign = b["CAMPAIGN ORDER NAME"];
        return aCampaign.localeCompare(bCampaign);
      }
      
      return 0;
    });
  }, [processedData, sortColumn, sortDirection, view]);

  // Group data by agency for advertiser view
  const groupedByAgency = useMemo(() => {
    if (view !== "advertiser") return {};
    
    const groups: Record<string, any[]> = {};
    sortedData.forEach(row => {
      const agency = row.AGENCY;
      if (!groups[agency]) {
        groups[agency] = [];
      }
      groups[agency].push(row);
    });
    
    return groups;
  }, [sortedData, view]);

  // Paginate the data
  const paginatedData = useMemo(() => {
    if (view === "advertiser") {
      // For advertiser view, we need to paginate the agencies, not individual rows
      const agencies = Object.keys(groupedByAgency);
      const startIndex = (page - 1) * rowsPerPage;
      const paginatedAgencies = agencies.slice(startIndex, startIndex + rowsPerPage);
      
      const result: Record<string, any[]> = {};
      paginatedAgencies.forEach(agency => {
        result[agency] = groupedByAgency[agency];
      });
      return result;
    } else {
      const startIndex = (page - 1) * rowsPerPage;
      return sortedData.slice(startIndex, startIndex + rowsPerPage);
    }
  }, [sortedData, page, rowsPerPage, view, groupedByAgency]);
  
  // Total number of pages based on selected rows per page
  const totalPages = useMemo(() => {
    if (view === "advertiser") {
      return Math.ceil(Object.keys(groupedByAgency).length / rowsPerPage);
    }
    return Math.ceil(sortedData.length / rowsPerPage);
  }, [sortedData, rowsPerPage, view, groupedByAgency]);

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
  const handleViewChange = (newView: "daily" | "aggregate" | "advertiser") => {
    setView(newView);
    setPage(1); // Reset to first page when view changes
    
    // If switching views, keep the same sort column if it exists in both views
    if (newView === 'aggregate' && sortColumn === 'DATE') {
      setSortColumn("CAMPAIGN ORDER NAME");
    } else if (newView === 'advertiser' && (sortColumn === 'DATE' || sortColumn === 'CAMPAIGN ORDER NAME')) {
      setSortColumn("AGENCY");
    }
  };
  
  // Toggle agency expansion
  const toggleAgency = (agency: string) => {
    const newExpanded = new Set(expandedAgencies);
    if (newExpanded.has(agency)) {
      newExpanded.delete(agency);
    } else {
      newExpanded.add(agency);
    }
    setExpandedAgencies(newExpanded);
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
        columns = ['AGENCY', 'ADVERTISER', 'IMPRESSIONS', 'CLICKS', 'CTR', 'TRANSACTIONS', 'REVENUE', 'SPEND', 'ROAS'];
      } else {
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
            <TableRow className="text-xs">
              {view === "advertiser" ? (
                <>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-1 w-[30%]"
                    onClick={() => handleSort("AGENCY")}
                  >
                    Agency
                    {sortColumn === "AGENCY" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 py-1 px-1 w-[30%]"
                    onClick={() => handleSort("ADVERTISER")}
                  >
                    Advertiser
                    {sortColumn === "ADVERTISER" && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                </>
              ) : (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 py-1 px-1 w-[40%]"
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
                  className="cursor-pointer hover:bg-muted/50 py-1 px-1 text-right"
                  onClick={() => handleSort("DATE")}
                >
                  Date
                  {sortColumn === "DATE" && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
              )}
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-1"
                onClick={() => handleSort("IMPRESSIONS")}
              >
                Impressions
                {sortColumn === "IMPRESSIONS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-1"
                onClick={() => handleSort("CLICKS")}
              >
                Clicks
                {sortColumn === "CLICKS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-1"
                onClick={() => handleSort("CTR")}
              >
                CTR
                {sortColumn === "CTR" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-1"
                onClick={() => handleSort("TRANSACTIONS")}
              >
                Transactions
                {sortColumn === "TRANSACTIONS" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-1"
                onClick={() => handleSort("REVENUE")}
              >
                Revenue
                {sortColumn === "REVENUE" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-1"
                onClick={() => handleSort("SPEND")}
              >
                Spend
                {sortColumn === "SPEND" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right py-1 px-1 pr-3"
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
              Object.keys(paginatedData as Record<string, any[]>).length > 0 ? (
                Object.entries(paginatedData as Record<string, any[]>).map(([agency, advertisers]) => (
                  <Collapsible key={agency} open={expandedAgencies.has(agency)} onOpenChange={() => toggleAgency(agency)}>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/25 font-medium bg-muted/10">
                        <TableCell colSpan={9} className="py-2 px-1">
                          <div className="flex items-center">
                            {expandedAgencies.has(agency) ? (
                              <ChevronDown className="h-4 w-4 mr-2" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2" />
                            )}
                            <span className="font-semibold">{agency}</span>
                            <span className="ml-2 text-sm text-muted-foreground">({advertisers.length} advertisers)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {advertisers.map((advertiser, index) => (
                        <TableRow key={`${agency}-${advertiser.ADVERTISER}-${index}`} className="text-xs">
                          <TableCell className="py-1 px-1 pl-8 text-muted-foreground">{agency}</TableCell>
                          <TableCell className="font-medium py-1 px-1" title={advertiser.ADVERTISER}>
                            {advertiser.ADVERTISER}
                          </TableCell>
                          <TableCell className="text-right py-1 px-1">{formatColumnValue(advertiser, "IMPRESSIONS")}</TableCell>
                          <TableCell className="text-right py-1 px-1">{formatColumnValue(advertiser, "CLICKS")}</TableCell>
                          <TableCell className="text-right py-1 px-1">{formatColumnValue(advertiser, "CTR")}</TableCell>
                          <TableCell className="text-right py-1 px-1">{formatColumnValue(advertiser, "TRANSACTIONS")}</TableCell>
                          <TableCell className="text-right py-1 px-1">{formatColumnValue(advertiser, "REVENUE")}</TableCell>
                          <TableCell className="text-right py-1 px-1">{formatColumnValue(advertiser, "SPEND")}</TableCell>
                          <TableCell className="text-right py-1 px-1 pr-3">{formatColumnValue(advertiser, "ROAS")}</TableCell>
                        </TableRow>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-1">
                    No data available
                  </TableCell>
                </TableRow>
              )
            ) : (
              (paginatedData as any[]).length > 0 ? (
                (paginatedData as any[]).map((row, index) => (
                  <TableRow key={`${row["CAMPAIGN ORDER NAME"]}-${row.DATE || index}`} className="text-xs">
                    <TableCell className="font-medium py-1 px-1 break-words" title={row["CAMPAIGN ORDER NAME"]}>
                      {row["CAMPAIGN ORDER NAME"]}
                    </TableCell>
                    
                    {view === "daily" && (
                      <TableCell className="py-1 px-1 text-right">{formatColumnValue(row, "DATE")}</TableCell>
                    )}
                    
                    <TableCell className="text-right py-1 px-1">{formatColumnValue(row, "IMPRESSIONS")}</TableCell>
                    <TableCell className="text-right py-1 px-1">{formatColumnValue(row, "CLICKS")}</TableCell>
                    <TableCell className="text-right py-1 px-1">{formatColumnValue(row, "CTR")}</TableCell>
                    <TableCell className="text-right py-1 px-1">{formatColumnValue(row, "TRANSACTIONS")}</TableCell>
                    <TableCell className="text-right py-1 px-1">{formatColumnValue(row, "REVENUE")}</TableCell>
                    <TableCell className="text-right py-1 px-1">{formatColumnValue(row, "SPEND")}</TableCell>
                    <TableCell className="text-right py-1 px-1 pr-3">{formatColumnValue(row, "ROAS")}</TableCell>
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
        {view === "advertiser" 
          ? `Showing ${Object.keys(paginatedData as Record<string, any[]>).length} agencies with ${Object.values(paginatedData as Record<string, any[]>).reduce((total, advertisers) => total + advertisers.length, 0)} advertisers`
          : `Showing ${(paginatedData as any[]).length} of ${sortedData.length} results`
        }
      </div>
    </div>
  );
};

export default RawDataTable;

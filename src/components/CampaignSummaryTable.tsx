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
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";
import { formatNumber, formatCurrency } from "@/lib/formatters";

interface CampaignSummaryTableProps {
  data: any[];
  useGlobalFilters?: boolean;
  onCampaignSelect?: (campaignName: string) => void;
}

interface CampaignSummary {
  campaignName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  transactions: number;
  spend: number;
  roas: number;
  dateRange: string;
  rowCount: number;
}

const CampaignSummaryTable = ({ data, useGlobalFilters = false, onCampaignSelect }: CampaignSummaryTableProps) => {
  const { isTestCampaign, extractAdvertiserName, extractAgencyInfo } = useCampaignFilter();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>("campaignName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");

  // Aggregate data by campaign
  const campaignSummaries = useMemo(() => {
    if (!data || data.length === 0) return [];

    const campaignGroups = new Map<string, any[]>();

    // Group data by campaign name
    data.forEach(row => {
      if (!row?.["CAMPAIGN ORDER NAME"] || row.DATE === 'Totals') return;

      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (!campaignGroups.has(campaignName)) {
        campaignGroups.set(campaignName, []);
      }
      campaignGroups.get(campaignName)!.push(row);
    });

    // Calculate aggregated metrics for each campaign
    const summaries: CampaignSummary[] = [];

    campaignGroups.forEach((rows, campaignName) => {
      let impressions = 0;
      let clicks = 0;
      let revenue = 0;
      let transactions = 0;
      let spend = 0;

      const dates = new Set<string>();

      rows.forEach(row => {
        impressions += parseFloat(row.IMPRESSIONS || 0);
        clicks += parseFloat(row.CLICKS || 0);
        revenue += parseFloat(row.REVENUE || 0);
        transactions += parseFloat(row.TRANSACTIONS || 0);
        spend += parseFloat(row.SPEND || 0);
        if (row.DATE) dates.add(row.DATE);
      });

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const roas = spend > 0 ? revenue / spend : 0;

      // Create date range string
      const sortedDates = Array.from(dates).sort();
      const dateRange = sortedDates.length > 1
        ? `${sortedDates[0]} - ${sortedDates[sortedDates.length - 1]}`
        : sortedDates[0] || '';

      summaries.push({
        campaignName,
        impressions,
        clicks,
        ctr,
        revenue,
        transactions,
        spend,
        roas,
        dateRange,
        rowCount: rows.length
      });
    });

    return summaries;
  }, [data]);

  // Filter summaries based on search term
  const filteredSummaries = useMemo(() => {
    if (!searchTerm) return campaignSummaries;

    return campaignSummaries.filter(summary =>
      summary.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [campaignSummaries, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredSummaries].sort((a, b) => {
      let aValue = a[sortColumn as keyof CampaignSummary];
      let bValue = b[sortColumn as keyof CampaignSummary];

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredSummaries, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Helper function to format numbers
  // Using centralized formatters from @/lib/formatters

  // Helper function to encode campaign name for URL
  const encodeCampaignName = (name: string) => {
    return encodeURIComponent(name);
  };

  return (
    <div className="space-y-4">
      {/* Header with search and controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Campaign Summary</h2>
          <span className="text-sm text-muted-foreground">
            {filteredSummaries.length} campaigns
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />

          <Select value={rowsPerPage.toString()} onValueChange={(value) => {
            setRowsPerPage(parseInt(value));
            setPage(1);
          }}>
            <SelectTrigger className="w-20">
              <SelectValue />
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

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("campaignName")}
              >
                Campaign Name
                {sortColumn === "campaignName" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("impressions")}
              >
                Impressions
                {sortColumn === "impressions" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("clicks")}
              >
                Clicks
                {sortColumn === "clicks" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("ctr")}
              >
                CTR
                {sortColumn === "ctr" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("revenue")}
              >
                Revenue
                {sortColumn === "revenue" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("transactions")}
              >
                Transactions
                {sortColumn === "transactions" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("roas")}
              >
                ROAS
                {sortColumn === "roas" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort("rowCount")}
              >
                Data Points
                {sortColumn === "rowCount" && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((summary, index) => (
              <TableRow key={summary.campaignName} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <button
                    onClick={() => onCampaignSelect?.(summary.campaignName)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-left"
                  >
                    {summary.campaignName}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(summary.impressions, { compact: true })}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(summary.clicks, { compact: true })}
                </TableCell>
                <TableCell className="text-right">
                  {summary.ctr.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(summary.revenue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(summary.transactions, { compact: true })}
                </TableCell>
                <TableCell className="text-right">
                  {summary.roas.toFixed(2)}x
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {summary.rowCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * rowsPerPage) + 1} to {Math.min(page * rowsPerPage, sortedData.length)} of {sortedData.length} campaigns
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {totalPages > 5 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default CampaignSummaryTable;
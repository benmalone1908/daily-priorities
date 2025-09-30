import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, TrendingUp, TrendingDown, Minus, ArrowUpDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
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

// Import our custom hook
import { useDataTable, GroupingLevel, TimeAggregation } from "@/hooks/useDataTable";

interface RawDataTableProps {
  data: any[];
  useGlobalFilters?: boolean;
}

/**
 * Refactored RawDataTable component - reduced from 822 lines
 * Uses extracted custom hook for data processing and state management
 */
const RawDataTableRefactored = ({ data, useGlobalFilters = false }: RawDataTableProps) => {
  // Use our custom hook for all data processing and state management
  const { state, actions, data: tableData } = useDataTable({ data, useGlobalFilters });

  // Helper function to format values
  const formatValue = (value: number, type: 'currency' | 'percentage' | 'number' = 'number') => {
    if (type === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (type === 'percentage') {
      return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString();
  };

  // Helper function to get sort icon
  const getSortIcon = (column: string) => {
    if (state.sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return state.sortDirection === 'asc' ?
      <TrendingUp className="ml-2 h-4 w-4" /> :
      <TrendingDown className="ml-2 h-4 w-4" />;
  };

  // Helper function to render pagination
  const renderPagination = () => {
    const { totalPages } = tableData;
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, state.page - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <Pagination>
        <PaginationContent>
          {state.page > 1 && (
            <PaginationItem>
              <PaginationPrevious onClick={() => actions.setPage(state.page - 1)} />
            </PaginationItem>
          )}

          {pageNumbers.map(pageNum => (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => actions.setPage(pageNum)}
                isActive={pageNum === state.page}
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ))}

          {state.page < totalPages && (
            <PaginationItem>
              <PaginationNext onClick={() => actions.setPage(state.page + 1)} />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Grouping Level */}
          <div className="flex items-center gap-2">
            <Label htmlFor="grouping">Group by:</Label>
            <Select value={state.groupingLevel} onValueChange={(value) => actions.setGroupingLevel(value as GroupingLevel)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="advertiser">Advertiser</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Aggregation */}
          <div className="flex items-center gap-2">
            <Label htmlFor="time">Time:</Label>
            <Select value={state.timeAggregation} onValueChange={(value) => actions.setTimeAggregation(value as TimeAggregation)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="total">Total</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <Label htmlFor="rows">Rows:</Label>
            <Select value={state.rowsPerPage.toString()} onValueChange={(value) => actions.setRowsPerPage(parseInt(value))}>
              <SelectTrigger className="w-16">
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

        <div className="flex items-center gap-4">
          {/* Attribution Only Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="attribution-only"
              checked={state.includeAttributionOnly}
              onCheckedChange={actions.setIncludeAttributionOnly}
            />
            <Label htmlFor="attribution-only">Attribution Only</Label>
          </div>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={actions.exportToCSV}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {tableData.paginatedData.length} of {tableData.totalRows} results
        {state.includeAttributionOnly && " (attribution data only)"}
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer"
                onClick={() => actions.handleSort('groupKey')}
              >
                <div className="flex items-center">
                  {state.groupingLevel === "date" ? "Date" :
                   state.groupingLevel === "campaign" ? "Campaign" :
                   state.groupingLevel === "advertiser" ? "Advertiser" :
                   "Agency"}
                  {getSortIcon('groupKey')}
                </div>
              </TableHead>

              {state.timeAggregation !== "total" && (
                <TableHead
                  className="cursor-pointer"
                  onClick={() => actions.handleSort('timeKey')}
                >
                  <div className="flex items-center">
                    Period
                    {getSortIcon('timeKey')}
                  </div>
                </TableHead>
              )}

              <TableHead
                className="text-right cursor-pointer"
                onClick={() => actions.handleSort('impressions')}
              >
                <div className="flex items-center justify-end">
                  Impressions
                  {getSortIcon('impressions')}
                </div>
              </TableHead>

              <TableHead
                className="text-right cursor-pointer"
                onClick={() => actions.handleSort('clicks')}
              >
                <div className="flex items-center justify-end">
                  Clicks
                  {getSortIcon('clicks')}
                </div>
              </TableHead>

              <TableHead
                className="text-right cursor-pointer"
                onClick={() => actions.handleSort('ctr')}
              >
                <div className="flex items-center justify-end">
                  CTR
                  {getSortIcon('ctr')}
                </div>
              </TableHead>

              <TableHead
                className="text-right cursor-pointer"
                onClick={() => actions.handleSort('revenue')}
              >
                <div className="flex items-center justify-end">
                  Revenue
                  {getSortIcon('revenue')}
                </div>
              </TableHead>

              <TableHead
                className="text-right cursor-pointer"
                onClick={() => actions.handleSort('spend')}
              >
                <div className="flex items-center justify-end">
                  Spend
                  {getSortIcon('spend')}
                </div>
              </TableHead>

              <TableHead
                className="text-right cursor-pointer"
                onClick={() => actions.handleSort('roas')}
              >
                <div className="flex items-center justify-end">
                  ROAS
                  {getSortIcon('roas')}
                </div>
              </TableHead>

              <TableHead
                className="text-right cursor-pointer"
                onClick={() => actions.handleSort('transactions')}
              >
                <div className="flex items-center justify-end">
                  Transactions
                  {getSortIcon('transactions')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {tableData.paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={state.timeAggregation === "total" ? 7 : 8}
                  className="text-center py-8 text-gray-500"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              tableData.paginatedData.map((row, index) => (
                <TableRow key={row.compositeKey || index}>
                  <TableCell className="font-medium max-w-[300px] truncate" title={row.groupKey}>
                    {row.groupKey}
                  </TableCell>

                  {state.timeAggregation !== "total" && (
                    <TableCell className="max-w-[150px] truncate" title={row.timeKey}>
                      {row.timeKey}
                    </TableCell>
                  )}

                  <TableCell className="text-right">
                    {formatValue(row.impressions)}
                  </TableCell>

                  <TableCell className="text-right">
                    {formatValue(row.clicks)}
                  </TableCell>

                  <TableCell className="text-right">
                    {formatValue(row.ctr, 'percentage')}
                  </TableCell>

                  <TableCell className="text-right">
                    {formatValue(row.revenue, 'currency')}
                  </TableCell>

                  <TableCell className="text-right">
                    {formatValue(row.spend, 'currency')}
                  </TableCell>

                  <TableCell className="text-right">
                    {row.roas.toFixed(2)}x
                  </TableCell>

                  <TableCell className="text-right">
                    {formatValue(row.transactions)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
};

export default RawDataTableRefactored;
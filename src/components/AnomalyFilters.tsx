import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { CampaignAnomaly, getAnomalyTypeDisplayName } from "@/utils/anomalyDetection";
import { AnomalyFilters } from "@/utils/anomalyFilters";

export type { AnomalyFilters };

interface AnomalyFiltersProps {
  anomalies: CampaignAnomaly[];
  filters: AnomalyFilters;
  onFiltersChange: (filters: AnomalyFilters) => void;
}

export function AnomalyFiltersComponent({ anomalies, filters, onFiltersChange }: AnomalyFiltersProps) {

  const handleFilterChange = (key: keyof AnomalyFilters, value: string | undefined) => {
    // Convert "__all__" back to undefined (no filter)
    const actualValue = value === "__all__" ? undefined : value;

    const newFilters = {
      ...filters,
      [key]: actualValue,
      // Auto-clear severity filter when selecting transaction drop type since all are high severity
      ...(key === 'anomalyType' && actualValue === 'transaction_drop' ? { severity: undefined } : {})
    };

    onFiltersChange(newFilters);
  };

  const clearFilter = (key: keyof AnomalyFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).length;

  const renderActiveFilters = () => {
    if (activeFilterCount === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {filters.severity && (
          <Badge variant="outline" className="flex items-center gap-1">
            Severity: {filters.severity}
            <button onClick={() => clearFilter('severity')}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.anomalyType && (
          <Badge variant="outline" className="flex items-center gap-1">
            Type: {getAnomalyTypeDisplayName(filters.anomalyType)}
            <button onClick={() => clearFilter('anomalyType')}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.recency && (
          <Badge variant="outline" className="flex items-center gap-1">
            Last {filters.recency} days
            <button onClick={() => clearFilter('recency')}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="text-xs h-6"
        >
          Clear All
        </Button>
      </div>
    );
  };

  return (
    <div className="flex justify-end items-center gap-3">
      {/* Severity Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Severity:</Label>
        <Select
          value={filters.severity || ""}
          onValueChange={(value) => handleFilterChange('severity', value)}
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All severities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Anomaly Type Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Type:</Label>
        <Select
          value={filters.anomalyType || ""}
          onValueChange={(value) => handleFilterChange('anomalyType', value)}
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            <SelectItem value="impression_change">Impression Change</SelectItem>
            <SelectItem value="transaction_drop">Transaction Drop</SelectItem>
            <SelectItem value="transaction_zero">Zero Transactions</SelectItem>
            <SelectItem value="suspected_bot_activity">Suspected Bot Activity</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Export the active filters component separately for use in NotificationsTab
export const ActiveFilters = ({ filters, onFiltersChange }: AnomalyFiltersProps) => {
  const clearFilter = (key: keyof AnomalyFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).length;

  if (activeFilterCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.severity && (
        <Badge variant="outline" className="flex items-center gap-1">
          Severity: {filters.severity}
          <button onClick={() => clearFilter('severity')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {filters.anomalyType && (
        <Badge variant="outline" className="flex items-center gap-1">
          Type: {getAnomalyTypeDisplayName(filters.anomalyType)}
          <button onClick={() => clearFilter('anomalyType')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {filters.recency && (
        <Badge variant="outline" className="flex items-center gap-1">
          Last {filters.recency} days
          <button onClick={() => clearFilter('recency')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearAllFilters}
        className="text-xs h-6"
      >
        Clear All
      </Button>
    </div>
  );
}
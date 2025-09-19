import { useState } from "react";
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

export interface AnomalyFilters {
  severity?: 'high' | 'medium' | 'low';
  anomalyType?: 'impression_change' | 'transaction_drop' | 'transaction_zero' | 'suspected_bot_activity';
  campaignName?: string;
  dateFrom?: string;
  dateTo?: string;
  recency?: '3' | '7' | '10' | '14' | '30';
}

interface AnomalyFiltersProps {
  anomalies: CampaignAnomaly[];
  filters: AnomalyFilters;
  onFiltersChange: (filters: AnomalyFilters) => void;
}

export function AnomalyFiltersComponent({ anomalies, filters, onFiltersChange }: AnomalyFiltersProps) {
  // Get unique campaign names from anomalies - with safety check
  let uniqueCampaigns: string[] = [];
  try {
    uniqueCampaigns = Array.from(
      new Set((anomalies || []).map(a => a?.campaign_name).filter(name => name && name.length > 0))
    ).sort();
  } catch (error) {
    console.error("Error processing campaign names:", error);
    uniqueCampaigns = [];
  }

  const handleFilterChange = (key: keyof AnomalyFilters, value: string | undefined) => {
    // Convert "__all__" back to undefined (no filter)
    const actualValue = value === "__all__" ? undefined : value;

    let newFilters = {
      ...filters,
      [key]: actualValue
    };

    // Auto-clear severity filter when selecting transaction drop type since all are high severity
    if (key === 'anomalyType' && actualValue === 'transaction_drop') {
      newFilters.severity = undefined;
    }

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
        {filters.campaignName && (
          <Badge variant="outline" className="flex items-center gap-1">
            Campaign: {filters.campaignName.length > 20
              ? `${filters.campaignName.substring(0, 20)}...`
              : filters.campaignName}
            <button onClick={() => clearFilter('campaignName')}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.dateFrom && (
          <Badge variant="outline" className="flex items-center gap-1">
            From: {filters.dateFrom}
            <button onClick={() => clearFilter('dateFrom')}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.dateTo && (
          <Badge variant="outline" className="flex items-center gap-1">
            To: {filters.dateTo}
            <button onClick={() => clearFilter('dateTo')}>
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
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Severity Filter */}
        <div className="space-y-1">
          <Label className="text-xs">Severity</Label>
          <Select
            value={filters.severity || ""}
            onValueChange={(value) => handleFilterChange('severity', value)}
          >
            <SelectTrigger className="h-8">
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
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={filters.anomalyType || ""}
            onValueChange={(value) => handleFilterChange('anomalyType', value)}
          >
            <SelectTrigger className="h-8">
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

        {/* Campaign Filter */}
        <div className="space-y-1">
          <Label className="text-xs">Campaign</Label>
          <Select
            value={filters.campaignName || ""}
            onValueChange={(value) => handleFilterChange('campaignName', value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All campaigns</SelectItem>
              {uniqueCampaigns.map((campaign, index) => (
                <SelectItem key={`${campaign}-${index}`} value={campaign || `unknown-${index}`}>
                  {campaign || 'Unknown Campaign'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From Filter */}
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            className="h-8 text-sm"
            value={filters.dateFrom || ""}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>

        {/* Date To Filter */}
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            className="h-8 text-sm"
            value={filters.dateTo || ""}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>
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
      {filters.campaignName && (
        <Badge variant="outline" className="flex items-center gap-1">
          Campaign: {filters.campaignName.length > 20
            ? `${filters.campaignName.substring(0, 20)}...`
            : filters.campaignName}
          <button onClick={() => clearFilter('campaignName')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {filters.dateFrom && (
        <Badge variant="outline" className="flex items-center gap-1">
          From: {filters.dateFrom}
          <button onClick={() => clearFilter('dateFrom')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {filters.dateTo && (
        <Badge variant="outline" className="flex items-center gap-1">
          To: {filters.dateTo}
          <button onClick={() => clearFilter('dateTo')}>
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

/**
 * Filter anomalies based on the provided filters
 */
export function filterAnomalies(anomalies: CampaignAnomaly[], filters: AnomalyFilters): CampaignAnomaly[] {
  return anomalies.filter(anomaly => {
    // Filter by severity
    if (filters.severity && anomaly.severity !== filters.severity) {
      return false;
    }

    // Filter by anomaly type
    if (filters.anomalyType && anomaly.anomaly_type !== filters.anomalyType) {
      return false;
    }

    // Filter by campaign name
    if (filters.campaignName && anomaly.campaign_name !== filters.campaignName) {
      return false;
    }

    // Filter by recency
    if (filters.recency) {
      const daysBack = parseInt(filters.recency);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      if (anomaly.date_detected < cutoffDateString) {
        return false;
      }
    }

    // Filter by date from (only if recency is not set to avoid conflicts)
    if (!filters.recency && filters.dateFrom && anomaly.date_detected < filters.dateFrom) {
      return false;
    }

    // Filter by date to (only if recency is not set to avoid conflicts)
    if (!filters.recency && filters.dateTo && anomaly.date_detected > filters.dateTo) {
      return false;
    }

    return true;
  });
}
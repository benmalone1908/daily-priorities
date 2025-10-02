import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  EyeOff,
  MoreHorizontal,
  ShoppingCart,
  Bot,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import {
  CampaignAnomaly,
  formatAnomalyMessage,
  getAnomalyTypeDisplayName,
  getSeverityColor
} from "@/utils/anomalyDetection";

interface AnomalyTableProps {
  anomalies: CampaignAnomaly[];
  onIgnore: (anomalyId: string) => void;
  onUpdateDuration: (anomalyId: string, duration: number | null) => void;
}

interface AnomalyRowProps {
  anomaly: CampaignAnomaly;
  onIgnore: (anomalyId: string) => void;
  onUpdateDuration: (anomalyId: string, duration: number | null) => void;
}

function AnomalyRow({ anomaly, onIgnore, onUpdateDuration }: AnomalyRowProps) {
  const [customDuration, setCustomDuration] = useState<string>(
    anomaly.custom_duration?.toString() || ""
  );
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  const getIcon = () => {
    switch (anomaly.anomaly_type) {
      case 'impression_change': {
        const isIncrease = (anomaly.details.percentage_change || 0) > 0;
        return isIncrease ?
          <TrendingUp className="h-3 w-3" /> :
          <TrendingDown className="h-3 w-3" />;
      }
      case 'transaction_drop':
        return <TrendingDown className="h-3 w-3" />;
      case 'transaction_zero':
        return <ShoppingCart className="h-3 w-3 stroke-red-600" strokeWidth={1.5} fill="none" />;
      case 'suspected_bot_activity':
        return <Bot className="h-3 w-3 stroke-orange-600" strokeWidth={1.5} fill="none" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const handleIgnore = () => {
    if (anomaly.id) {
      onIgnore(anomaly.id);
    }
  };

  const handleSaveDuration = () => {
    if (anomaly.id) {
      const duration = customDuration ? parseInt(customDuration) : null;
      onUpdateDuration(anomaly.id, duration);
      setIsEditingDuration(false);
    }
  };

  const handleCancelDuration = () => {
    setCustomDuration(anomaly.custom_duration?.toString() || "");
    setIsEditingDuration(false);
  };

  return (
    <TableRow className="hover:bg-gray-50">
      {/* Date Detected Column */}
      <TableCell className="text-sm text-gray-600">
        {new Date(anomaly.date_detected).toLocaleDateString()}
      </TableCell>

      {/* Type Column */}
      <TableCell className="font-medium">
        <Badge variant="outline" className="text-xs flex items-center gap-1.5 w-fit">
          {getIcon()}
          {getAnomalyTypeDisplayName(anomaly.anomaly_type)}
        </Badge>
      </TableCell>

      {/* Severity Column */}
      <TableCell>
        <Badge className={`${getSeverityColor(anomaly.severity)} text-xs`}>
          {anomaly.severity.toUpperCase()}
        </Badge>
      </TableCell>

      {/* Campaign Column */}
      <TableCell className="max-w-xs">
        <Dialog>
          <DialogTrigger asChild>
            <div className="cursor-pointer hover:bg-gray-50 rounded-sm p-1 -m-1">
              <div className="truncate font-medium text-blue-600 hover:text-blue-800" title={anomaly.campaign_name}>
                {anomaly.campaign_name}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {formatAnomalyMessage(anomaly)}
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getIcon()}
                Anomaly Details
              </DialogTitle>
              <DialogDescription>
                Manage this campaign anomaly and customize detection settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Campaign Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(anomaly.severity)}>
                    {anomaly.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {getAnomalyTypeDisplayName(anomaly.anomaly_type)}
                  </Badge>
                </div>
                <h4 className="font-semibold text-base" title={anomaly.campaign_name}>
                  {anomaly.campaign_name}
                </h4>
                <p className="text-sm text-gray-700">
                  {formatAnomalyMessage(anomaly)}
                </p>
                <p className="text-xs text-gray-500">
                  Detected on {new Date(anomaly.date_detected).toLocaleDateString()}
                </p>
              </div>

              {/* Anomaly Details */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Detailed Metrics</Label>
                <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-md">
                  {anomaly.anomaly_type === 'impression_change' && (
                    <>
                      <div className="flex justify-between">
                        <span>Previous:</span>
                        <span className="font-mono">{anomaly.details.previous_value?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current:</span>
                        <span className="font-mono">{anomaly.details.current_value?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Change:</span>
                        <span className={`font-mono ${(anomaly.details.percentage_change || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {anomaly.details.percentage_change}%
                        </span>
                      </div>
                    </>
                  )}
                  {anomaly.anomaly_type === 'transaction_drop' && (
                    <>
                      <div className="flex justify-between">
                        <span>Previous:</span>
                        <span className="font-mono">{anomaly.details.previous_value}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current:</span>
                        <span className="font-mono">{anomaly.details.current_value}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-red-600">
                        <span>Drop:</span>
                        <span className="font-mono">{Math.abs(anomaly.details.percentage_change || 0)}%</span>
                      </div>
                    </>
                  )}
                  {anomaly.anomaly_type === 'transaction_zero' && (
                    <div className="flex justify-between font-semibold">
                      <span>Consecutive zero days:</span>
                      <span className="font-mono text-red-600">{anomaly.details.consecutive_days}</span>
                    </div>
                  )}
                  {anomaly.anomaly_type === 'suspected_bot_activity' && (
                    <>
                      <div className="flex justify-between">
                        <span>Clicks:</span>
                        <span className="font-mono">{anomaly.details.clicks?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Impressions:</span>
                        <span className="font-mono">{anomaly.details.impressions?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-orange-600">
                        <span>CTR:</span>
                        <span className="font-mono">{anomaly.details.ctr_percentage}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Custom Duration Setting */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Custom Detection Duration
                </Label>
                {isEditingDuration ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Days (leave empty for default)"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="flex-1"
                      min="1"
                      max="30"
                    />
                    <Button size="sm" onClick={handleSaveDuration}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelDuration}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-sm text-gray-600">
                      {anomaly.custom_duration
                        ? `${anomaly.custom_duration} days (custom)`
                        : "Using default duration"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingDuration(true)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleIgnore}
                  className="flex items-center gap-2"
                >
                  <EyeOff className="h-4 w-4" />
                  Ignore Anomaly
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

type SortField = 'severity' | 'campaign' | 'date';
type SortDirection = 'asc' | 'desc';

export function AnomalyTable({ anomalies, onIgnore, onUpdateDuration }: AnomalyTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedAnomalies = useMemo(() => {
    return [...anomalies].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'severity': {
          const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        }
        case 'campaign':
          comparison = a.campaign_name.localeCompare(b.campaign_name);
          break;
        case 'date':
          comparison = new Date(a.date_detected).getTime() - new Date(b.date_detected).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [anomalies, sortField, sortDirection]);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      className="h-auto p-0 font-semibold hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ?
            <ChevronUp className="h-4 w-4" /> :
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </Button>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">
              <SortButton field="date">Date Detected</SortButton>
            </TableHead>
            <TableHead className="w-[240px]">Type</TableHead>
            <TableHead className="w-[100px]">
              <SortButton field="severity">Severity</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="campaign">Campaign</SortButton>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAnomalies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                No anomalies match your filters.
              </TableCell>
            </TableRow>
          ) : (
            sortedAnomalies.map((anomaly, index) => (
              <AnomalyRow
                key={anomaly.id || index}
                anomaly={anomaly}
                onIgnore={onIgnore}
                onUpdateDuration={onUpdateDuration}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
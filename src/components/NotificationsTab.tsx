import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { NotificationCard } from "./NotificationCard";
import { AnomalyFiltersComponent, AnomalyFilters, filterAnomalies } from "./AnomalyFilters";
import {
  CampaignAnomaly,
  detectAllAnomalies,
  CampaignDataRow
} from "@/utils/anomalyDetection";
import { useSupabase } from "@/contexts/SupabaseContext";
import { toast } from "sonner";

interface NotificationsTabProps {
  campaignData: any[];
}

export function NotificationsTab({ campaignData }: NotificationsTabProps) {
  const [anomalies, setAnomalies] = useState<CampaignAnomaly[]>([]);
  const [filters, setFilters] = useState<AnomalyFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [detectionSettings, setDetectionSettings] = useState({
    impressionThreshold: 20,
    transactionDropThreshold: 90,
    zeroTransactionDays: 2
  });

  // Convert campaign data to the format expected by anomaly detection
  const formatCampaignData = (data: any[]): CampaignDataRow[] => {
    return data.map(row => ({
      DATE: row.DATE || row.date,
      "CAMPAIGN ORDER NAME": row["CAMPAIGN ORDER NAME"] || row.campaign_order_name,
      IMPRESSIONS: Number(row.IMPRESSIONS || row.impressions) || 0,
      CLICKS: Number(row.CLICKS || row.clicks) || 0,
      REVENUE: Number(row.REVENUE || row.revenue) || 0,
      SPEND: Number(row.SPEND || row.spend) || 0,
      TRANSACTIONS: Number(row.TRANSACTIONS || row.transactions) || 0,
    }));
  };

  const { getAnomalies, upsertAnomalies, updateAnomaly } = useSupabase();

  // Scan for new anomalies
  const scanForAnomalies = async () => {
    setIsScanning(true);
    try {
      console.log("🔍 Scanning for anomalies...");
      console.log("🔍 Campaign data length:", campaignData.length);

      if (!campaignData || campaignData.length === 0) {
        toast.error("No campaign data available to scan");
        return;
      }

      const formattedData = formatCampaignData(campaignData);
      console.log("🔍 Formatted data sample:", formattedData.slice(0, 2));

      const detectedAnomalies = detectAllAnomalies(formattedData, detectionSettings);
      console.log(`🔍 Detected ${detectedAnomalies.length} anomalies`);

      // Store new anomalies in database
      if (detectedAnomalies.length > 0) {
        const anomaliesToInsert = detectedAnomalies.map(anomaly => ({
          campaign_name: anomaly.campaign_name,
          anomaly_type: anomaly.anomaly_type,
          date_detected: anomaly.date_detected,
          severity: anomaly.severity,
          details: anomaly.details,
          is_ignored: anomaly.is_ignored,
          custom_duration: anomaly.custom_duration
        }));

        console.log("🔍 Upserting anomalies to database...");
        await upsertAnomalies(anomaliesToInsert);
        console.log("🔍 Successfully upserted anomalies");
      }

      // Reload anomalies from database
      console.log("🔍 Loading anomalies from database...");
      const dbAnomalies = await getAnomalies(showIgnored);
      console.log("🔍 Loaded anomalies:", dbAnomalies.length);

      setAnomalies(dbAnomalies.map(a => ({
        ...a,
        id: a.id || undefined
      })));

      toast.success(`Scan complete: ${detectedAnomalies.length} anomalies found`);
    } catch (error) {
      console.error("Error scanning for anomalies:", error);
      console.error("Error details:", error);
      toast.error(`Failed to scan for anomalies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Load anomalies on component mount
  useEffect(() => {
    const loadAnomalies = async () => {
      setIsLoading(true);
      try {
        // Load existing anomalies from database
        const dbAnomalies = await getAnomalies(showIgnored);
        setAnomalies(dbAnomalies.map(a => ({
          ...a,
          id: a.id || undefined
        })));
      } catch (error) {
        console.error("Error loading anomalies:", error);
        toast.error("Failed to load anomalies");
      } finally {
        setIsLoading(false);
      }
    };

    loadAnomalies();
  }, [campaignData, showIgnored, getAnomalies]);

  // Handle ignoring an anomaly
  const handleIgnoreAnomaly = async (anomalyId: string) => {
    try {
      await updateAnomaly(anomalyId, { is_ignored: true });
      setAnomalies(prev =>
        prev.map(a =>
          a.id === anomalyId ? { ...a, is_ignored: true } : a
        )
      );
      toast.success("Anomaly ignored");
    } catch (error) {
      console.error("Error ignoring anomaly:", error);
      toast.error("Failed to ignore anomaly");
    }
  };

  // Handle updating custom duration
  const handleUpdateDuration = async (anomalyId: string, duration: number | null) => {
    try {
      await updateAnomaly(anomalyId, { custom_duration: duration });
      setAnomalies(prev =>
        prev.map(a =>
          a.id === anomalyId ? { ...a, custom_duration: duration } : a
        )
      );
      toast.success("Duration updated");
    } catch (error) {
      console.error("Error updating duration:", error);
      toast.error("Failed to update duration");
    }
  };

  // Filter anomalies based on current filters and show/hide ignored
  const filteredAnomalies = useMemo(() => {
    let filtered = filterAnomalies(anomalies, filters);

    if (!showIgnored) {
      filtered = filtered.filter(a => !a.is_ignored);
    }

    return filtered;
  }, [anomalies, filters, showIgnored]);

  // Count anomalies by severity (including recency filter)
  const anomalyCounts = useMemo(() => {
    // First filter by ignored status
    let activeAnomalies = anomalies.filter(a => !showIgnored ? !a.is_ignored : true);

    // Apply recency filter to counts
    if (filters.recency) {
      const daysBack = parseInt(filters.recency);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0];

      activeAnomalies = activeAnomalies.filter(a => a.date_detected >= cutoffDateString);
    }

    return {
      total: activeAnomalies.length,
      high: activeAnomalies.filter(a => a.severity === 'high').length,
      medium: activeAnomalies.filter(a => a.severity === 'medium').length,
      low: activeAnomalies.filter(a => a.severity === 'low').length,
    };
  }, [anomalies, showIgnored, filters.recency]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Notifications</h2>
          {anomalyCounts.total > 0 && (
            <Badge variant="destructive">{anomalyCounts.total}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Recency Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Show:</label>
            <Select
              value={filters.recency || "__all__"}
              onValueChange={(value) => {
                const actualValue = value === "__all__" ? undefined : value;
                setFilters(prev => ({ ...prev, recency: actualValue }));
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All time</SelectItem>
                <SelectItem value="3">Last 3 days</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="10">Last 10 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIgnored(!showIgnored)}
            className="flex items-center gap-2"
          >
            {showIgnored ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showIgnored ? 'Hide Ignored' : 'Show Ignored'}
          </Button>
          <Button
            onClick={scanForAnomalies}
            disabled={isScanning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan for Anomalies'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{anomalyCounts.total}</div>
            <div className="text-sm text-gray-600">Total Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{anomalyCounts.high}</div>
            <div className="text-sm text-gray-600">High Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{anomalyCounts.medium}</div>
            <div className="text-sm text-gray-600">Medium Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{anomalyCounts.low}</div>
            <div className="text-sm text-gray-600">Low Severity</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <AnomalyFiltersComponent
        anomalies={anomalies}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Anomalies List */}
      <div className="space-y-4">
        {filteredAnomalies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {anomalies.length === 0 ? "No anomalies detected" : "No anomalies match your filters"}
              </h3>
              <p className="text-gray-600">
                {anomalies.length === 0
                  ? "Your campaigns are running smoothly!"
                  : "Try adjusting your filters to see more results."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {filteredAnomalies.length} Anomal{filteredAnomalies.length === 1 ? 'y' : 'ies'}
                {Object.keys(filters).length > 0 && " (filtered)"}
              </h3>
            </div>
            <div className="space-y-3">
              {filteredAnomalies.map((anomaly, index) => (
                <NotificationCard
                  key={anomaly.id || index}
                  anomaly={anomaly}
                  onIgnore={handleIgnoreAnomaly}
                  onUpdateDuration={handleUpdateDuration}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detection Settings */}
      {campaignData.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No campaign data available. Upload campaign data to begin anomaly detection.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
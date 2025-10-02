import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Settings2,
  MoreHorizontal
} from "lucide-react";
import {
  CampaignAnomaly,
  formatAnomalyMessage,
  getAnomalyTypeDisplayName,
  getSeverityColor
} from "@/utils/anomalyDetection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NotificationCardProps {
  anomaly: CampaignAnomaly;
  onIgnore: (anomalyId: string) => void;
  onUpdateDuration: (anomalyId: string, duration: number | null) => void;
}

export function NotificationCard({ anomaly, onIgnore, onUpdateDuration }: NotificationCardProps) {
  const [customDuration, setCustomDuration] = useState<string>(
    anomaly.custom_duration?.toString() || ""
  );
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  const getIcon = () => {
    switch (anomaly.anomaly_type) {
      case 'impression_change': {
        const isIncrease = (anomaly.details.percentage_change || 0) > 0;
        return isIncrease ?
          <TrendingUp className="h-4 w-4 text-blue-600" /> :
          <TrendingDown className="h-4 w-4 text-orange-600" />;
      }
      case 'transaction_drop':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transaction_zero':
        return null; // No icon for zero transactions to avoid confusion
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
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
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getIcon() && <span>{getIcon()}</span>}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge className={`${getSeverityColor(anomaly.severity)} text-xs`}>
                {anomaly.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getAnomalyTypeDisplayName(anomaly.anomaly_type)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-500">
              {new Date(anomaly.date_detected).toLocaleDateString()}
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {getIcon() && getIcon()}
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
          </div>
        </div>

        {/* Compact summary */}
        <div className="mt-2">
          <p className="text-sm text-gray-700 truncate" title={anomaly.campaign_name}>
            <span className="font-medium">{anomaly.campaign_name}</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {formatAnomalyMessage(anomaly)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
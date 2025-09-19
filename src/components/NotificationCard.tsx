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
  Settings2
} from "lucide-react";
import {
  CampaignAnomaly,
  formatAnomalyMessage,
  getAnomalyTypeDisplayName,
  getSeverityColor
} from "@/utils/anomalyDetection";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NotificationCardProps {
  anomaly: CampaignAnomaly;
  onIgnore: (anomalyId: string) => void;
  onUpdateDuration: (anomalyId: string, duration: number | null) => void;
}

export function NotificationCard({ anomaly, onIgnore, onUpdateDuration }: NotificationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customDuration, setCustomDuration] = useState<string>(
    anomaly.custom_duration?.toString() || ""
  );
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  const getIcon = () => {
    switch (anomaly.anomaly_type) {
      case 'impression_change':
        const isIncrease = (anomaly.details.percentage_change || 0) > 0;
        return isIncrease ?
          <TrendingUp className="h-5 w-5 text-blue-600" /> :
          <TrendingDown className="h-5 w-5 text-orange-600" />;
      case 'transaction_drop':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'transaction_zero':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
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
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getSeverityColor(anomaly.severity)}>
                  {anomaly.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {getAnomalyTypeDisplayName(anomaly.anomaly_type)}
                </Badge>
              </div>
              <h4 className="font-semibold text-sm truncate" title={anomaly.campaign_name}>
                {anomaly.campaign_name}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {new Date(anomaly.date_detected).toLocaleDateString()}
            </span>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
        <p className="text-sm text-gray-700 mt-2">
          {formatAnomalyMessage(anomaly)}
        </p>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4 border-t pt-4">
              {/* Custom Duration Setting */}
              <div className="space-y-2">
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {anomaly.custom_duration
                        ? `${anomaly.custom_duration} days (custom)`
                        : "Default duration"}
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

              {/* Anomaly Details */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Details</Label>
                <div className="text-sm text-gray-600 space-y-1">
                  {anomaly.anomaly_type === 'impression_change' && (
                    <>
                      <div>Previous: {anomaly.details.previous_value?.toLocaleString()}</div>
                      <div>Current: {anomaly.details.current_value?.toLocaleString()}</div>
                      <div>Change: {anomaly.details.percentage_change}%</div>
                    </>
                  )}
                  {anomaly.anomaly_type === 'transaction_drop' && (
                    <>
                      <div>Previous: {anomaly.details.previous_value}</div>
                      <div>Current: {anomaly.details.current_value}</div>
                      <div>Drop: {Math.abs(anomaly.details.percentage_change || 0)}%</div>
                    </>
                  )}
                  {anomaly.anomaly_type === 'transaction_zero' && (
                    <div>Consecutive zero days: {anomaly.details.consecutive_days}</div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIgnore}
                  className="flex items-center gap-2"
                >
                  <EyeOff className="h-4 w-4" />
                  Ignore Anomaly
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
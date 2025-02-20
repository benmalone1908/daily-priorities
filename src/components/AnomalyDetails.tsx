import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { getColorClasses } from "@/utils/anomalyColors";

interface Anomaly {
  campaign: string;
  DATE: string;
  actualValue: number;
  mean: number;
  deviation: number;
}

interface AnomalyDetailsProps {
  anomalies: Anomaly[];
  metric: string;
}

const AnomalyDetails = ({ anomalies, metric }: AnomalyDetailsProps) => {
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  // Get unique campaigns
  const campaigns = Array.from(new Set(anomalies.map(a => a.campaign))).sort();
  
  // Group anomalies by campaign
  const anomaliesByCampaign = anomalies.reduce((acc, anomaly) => {
    if (!acc[anomaly.campaign]) {
      acc[anomaly.campaign] = [];
    }
    acc[anomaly.campaign].push(anomaly);
    return acc;
  }, {} as Record<string, Anomaly[]>);

  // Filter campaigns based on selection
  const filteredCampaigns = selectedCampaign === "all" 
    ? Object.entries(anomaliesByCampaign)
    : Object.entries(anomaliesByCampaign).filter(([campaign]) => campaign === selectedCampaign);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm text-blue-500 hover:underline">
          View all {anomalies.length} anomalies →
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{metric} Anomalies Detail</DialogTitle>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Filter by campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[60vh] mt-4">
          <div className="space-y-6">
            {filteredCampaigns.map(([campaign, campaignAnomalies]) => (
              <Card key={campaign} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{campaign}</h4>
                      <p className="text-sm text-muted-foreground">
                        {campaignAnomalies.length} anomal{campaignAnomalies.length === 1 ? 'y' : 'ies'} detected
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {campaignAnomalies.map((anomaly, idx) => {
                      const colorClasses = getColorClasses(anomaly.deviation);
                      return (
                        <div 
                          key={idx} 
                          className={`text-sm rounded-lg p-3 space-y-1 border ${colorClasses}`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`w-4 h-4 ${colorClasses.split(' ').find(c => c.startsWith('text-'))}`} />
                            <span className="font-medium text-gray-900">Date: {anomaly.DATE}</span>
                          </div>
                          <div className="pl-6 space-y-1">
                            <p className="text-gray-900">Value: {anomaly.actualValue.toLocaleString()}</p>
                            <p className="text-gray-900">Campaign Average: {Math.round(anomaly.mean).toLocaleString()}</p>
                            <p className={`font-medium ${colorClasses.split(' ').find(c => c.startsWith('text-'))}`}>
                              Deviation: {anomaly.deviation > 0 ? "+" : ""}{anomaly.deviation.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AnomalyDetails;


import { useMemo } from "react";
import { calculateCampaignHealth, CampaignHealthData } from "@/utils/campaignHealthScoring";
import CampaignHealthScatterPlot from "./CampaignHealthScatterPlot";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

interface CampaignHealthTabProps {
  data: any[];
  pacingData?: any[];
}

const CampaignHealthTab = ({ data, pacingData = [] }: CampaignHealthTabProps) => {
  const { isTestCampaign } = useCampaignFilter();

  // Debug logging to see what pacing data we're receiving
  console.log("CampaignHealthTab: Received pacing data length:", pacingData.length);
  if (pacingData.length > 0) {
    console.log("CampaignHealthTab: Sample pacing data:", pacingData[0]);
    console.log("CampaignHealthTab: Available pacing campaigns:", 
      pacingData.map(row => row["Campaign"]).filter(Boolean).slice(0, 5)
    );
  }

  const healthData = useMemo(() => {
    // Get unique campaigns excluding test campaigns
    const campaigns = Array.from(new Set(
      data
        .filter(row => row["CAMPAIGN ORDER NAME"] && !isTestCampaign(row["CAMPAIGN ORDER NAME"]))
        .map(row => row["CAMPAIGN ORDER NAME"])
    ));

    console.log("CampaignHealthTab: Processing campaigns:", campaigns.slice(0, 3));
    console.log("CampaignHealthTab: Passing pacing data length:", pacingData.length);

    // Calculate health score for each campaign
    return campaigns
      .map(campaignName => calculateCampaignHealth(data, campaignName, pacingData))
      .filter(campaign => campaign.healthScore > 0); // Only show campaigns with valid data
  }, [data, pacingData, isTestCampaign]);

  const summaryStats = useMemo(() => {
    if (healthData.length === 0) return { total: 0, healthy: 0, warning: 0, critical: 0, avgScore: 0 };

    const healthy = healthData.filter(c => c.healthScore >= 7).length;
    const warning = healthData.filter(c => c.healthScore >= 4 && c.healthScore < 7).length;
    const critical = healthData.filter(c => c.healthScore < 4).length;
    const avgScore = healthData.reduce((sum, c) => sum + c.healthScore, 0) / healthData.length;

    return {
      total: healthData.length,
      healthy,
      warning,
      critical,
      avgScore: Math.round(avgScore * 10) / 10
    };
  }, [healthData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{summaryStats.total}</div>
          <div className="text-sm text-muted-foreground">Total Campaigns</div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">{summaryStats.healthy}</div>
            <Badge className="bg-green-100 text-green-800">Healthy</Badge>
          </div>
          <div className="text-sm text-muted-foreground">Score ≥ 7.0</div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">{summaryStats.warning}</div>
            <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
          </div>
          <div className="text-sm text-muted-foreground">Score 4.0-6.9</div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">{summaryStats.critical}</div>
            <Badge className="bg-red-100 text-red-800">Critical</Badge>
          </div>
          <div className="text-sm text-muted-foreground">Score &lt; 4.0</div>
        </Card>
        
        <Card className="p-4">
          <div className="text-2xl font-bold">{summaryStats.avgScore}</div>
          <div className="text-sm text-muted-foreground">Average Score</div>
        </Card>
      </div>

      {/* Health Scoring Legend */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Health Score Methodology</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="font-medium">ROAS (40%)</div>
            <div className="text-muted-foreground">Return on Ad Spend</div>
          </div>
          <div>
            <div className="font-medium">Delivery Pacing (30%)</div>
            <div className="text-muted-foreground">Actual vs Expected</div>
          </div>
          <div>
            <div className="font-medium">Burn Rate (15%)</div>
            <div className="text-muted-foreground">Recent delivery pace</div>
          </div>
          <div>
            <div className="font-medium">CTR (10%)</div>
            <div className="text-muted-foreground">Click-through rate</div>
          </div>
          <div>
            <div className="font-medium">Overspend Risk (5%)</div>
            <div className="text-muted-foreground">Budget tracking</div>
          </div>
        </div>
      </Card>

      {/* Campaign Health Scatter Plot */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Campaign Health vs Completion</h3>
        <div className="mb-4 text-sm text-muted-foreground">
          This chart shows the relationship between campaign completion percentage and health score. 
          Green dots indicate healthy campaigns (≥7), yellow indicates warning (4-6.9), and red indicates critical (&lt;4).
        </div>
        <CampaignHealthScatterPlot healthData={healthData} />
      </Card>
    </div>
  );
};

export default CampaignHealthTab;

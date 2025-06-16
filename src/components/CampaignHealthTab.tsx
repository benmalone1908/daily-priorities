
import { useMemo } from "react";
import { calculateCampaignHealth, CampaignHealthData } from "@/utils/campaignHealthScoring";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface CampaignHealthTabProps {
  data: any[];
}

const CampaignHealthTab = ({ data }: CampaignHealthTabProps) => {
  const { isTestCampaign } = useCampaignFilter();

  const healthData = useMemo(() => {
    // Get unique campaigns excluding test campaigns
    const campaigns = Array.from(new Set(
      data
        .filter(row => row["CAMPAIGN ORDER NAME"] && !isTestCampaign(row["CAMPAIGN ORDER NAME"]))
        .map(row => row["CAMPAIGN ORDER NAME"])
    ));

    // Calculate health score for each campaign
    return campaigns
      .map(campaignName => {
        const campaignHealth = calculateCampaignHealth(data, campaignName);
        
        // Calculate completion percentage (simplified - using spend vs expected)
        const completionPercentage = campaignHealth.pace || 0;
        
        return {
          ...campaignHealth,
          completionPercentage: Math.min(100, Math.max(0, completionPercentage))
        };
      })
      .filter(campaign => campaign.healthScore > 0); // Only show campaigns with valid data
  }, [data, isTestCampaign]);

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

  const getScoreColor = (score: number) => {
    if (score >= 7) return "#10b981"; // green-500
    if (score >= 4) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
  };

  const chartData = healthData.map(campaign => ({
    x: campaign.completionPercentage,
    y: campaign.healthScore,
    campaignName: campaign.campaignName,
    score: campaign.healthScore,
    color: getScoreColor(campaign.healthScore)
  }));

  const chartConfig = {
    campaigns: {
      label: "Campaigns",
    },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{data.campaignName}</p>
          <p className="text-sm text-gray-600">
            Score: <span className="font-medium">{data.score.toFixed(1)}/10</span>
          </p>
          <p className="text-sm text-gray-600">
            Completion: <span className="font-medium">{data.x.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

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
        <div className="h-96">
          <ChartContainer config={chartConfig}>
            <ScatterChart
              data={chartData}
              margin={{
                top: 20,
                right: 20,
                bottom: 60,
                left: 60,
              }}
            >
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Completion %" 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                label={{ value: 'Campaign Completion %', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Health Score" 
                domain={[0, 10]}
                label={{ value: 'Health Score', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Scatter name="Campaigns" dataKey="y" fill="#8884d8">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ChartContainer>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center mt-4 space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm">Healthy (≥7.0)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm">Warning (4.0-6.9)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm">Critical (&lt;4.0)</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CampaignHealthTab;

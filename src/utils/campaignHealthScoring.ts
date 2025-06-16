export interface CampaignHealthData {
  campaignName: string;
  budget?: number;
  spend: number;
  impressions: number;
  clicks: number;
  revenue: number;
  transactions: number;
  expectedImpressions?: number;
  daysLeft?: number;
  campaignStartDate?: string;
  campaignEndDate?: string;
  daysElapsed?: number;
  totalDays?: number;
  roasScore: number;
  deliveryPacingScore: number;
  burnRateScore: number;
  ctrScore: number;
  overspendScore: number;
  healthScore: number;
  burnRateConfidence: string;
  pace?: number;
  ctr: number;
  roas: number;
  completionPercentage?: number;
}

export interface BurnRateData {
  oneDayRate: number;
  threeDayRate: number;
  sevenDayRate: number;
  confidence: string;
}

// CTR Benchmark - can be made configurable later
const CTR_BENCHMARK = 0.5; // 0.5% default benchmark

export function calculateROASScore(roas: number): number {
  if (roas >= 4.0) return 10;
  if (roas >= 3.0) return 7.5;
  if (roas >= 2.0) return 5;
  if (roas >= 1.0) return 2.5;
  if (roas > 0) return 1;
  return 0;
}

export function calculateDeliveryPacingScore(actualImpressions: number, expectedImpressions: number): number {
  if (expectedImpressions === 0) return 0;
  
  const pacingPercent = (actualImpressions / expectedImpressions) * 100;
  
  if (pacingPercent >= 95 && pacingPercent <= 105) return 10;
  if ((pacingPercent >= 90 && pacingPercent < 95) || (pacingPercent > 105 && pacingPercent <= 110)) return 8;
  if ((pacingPercent >= 80 && pacingPercent < 90) || (pacingPercent > 110 && pacingPercent <= 120)) return 6;
  if (pacingPercent < 80 || pacingPercent > 120) return 3;
  
  return 0;
}

export function calculateBurnRate(data: any[], campaignName: string): BurnRateData {
  // Filter data for this campaign and sort by date
  const campaignData = data
    .filter(row => row["CAMPAIGN ORDER NAME"] === campaignName && row.DATE !== 'Totals')
    .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
  
  if (campaignData.length === 0) {
    return {
      oneDayRate: 0,
      threeDayRate: 0,
      sevenDayRate: 0,
      confidence: 'no-data'
    };
  }
  
  // Get most recent data points
  const recent = campaignData.slice(-7); // Last 7 days
  
  const oneDayRate = recent.length >= 1 ? Number(recent[recent.length - 1].IMPRESSIONS) || 0 : 0;
  const threeDayRate = recent.length >= 3 ? 
    recent.slice(-3).reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0) / 3 : 0;
  const sevenDayRate = recent.length >= 7 ? 
    recent.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0) / 7 : 0;
  
  let confidence = 'no-data';
  if (recent.length >= 7) confidence = '7-day';
  else if (recent.length >= 3) confidence = '3-day';
  else if (recent.length >= 1) confidence = '1-day';
  
  return {
    oneDayRate,
    threeDayRate,
    sevenDayRate,
    confidence
  };
}

export function calculateBurnRateScore(burnRate: BurnRateData, requiredDailyImpressions: number): number {
  if (requiredDailyImpressions === 0) return 0;
  
  // Use best available burn rate based on confidence
  let currentRate = 0;
  switch (burnRate.confidence) {
    case '7-day':
      currentRate = burnRate.sevenDayRate;
      break;
    case '3-day':
      currentRate = burnRate.threeDayRate;
      break;
    case '1-day':
      currentRate = burnRate.oneDayRate;
      break;
    default:
      return 0;
  }
  
  const ratio = currentRate / requiredDailyImpressions;
  
  if (ratio >= 0.95 && ratio <= 1.05) return 10;
  if ((ratio >= 0.85 && ratio < 0.95) || (ratio > 1.05 && ratio <= 1.15)) return 8;
  if (ratio < 0.85 || ratio > 1.15) return 5;
  
  return 0;
}

export function calculateCTRScore(ctr: number, benchmark: number = CTR_BENCHMARK): number {
  if (ctr === 0 || benchmark === 0) return 0;
  
  const deviation = (ctr - benchmark) / benchmark;
  
  if (deviation > 0.1) return 10; // >10% above benchmark
  if (deviation >= -0.1 && deviation <= 0.1) return 8; // ±10%
  if (deviation < -0.1) return 5; // >10% below benchmark
  
  return 0;
}

export function calculateOverspendScore(spend: number, budget: number, burnRate: BurnRateData, daysLeft: number): number {
  if (!budget || budget === 0) return 0; // No budget data available
  
  // Use best available burn rate for spend projection
  let dailySpendRate = 0;
  switch (burnRate.confidence) {
    case '7-day':
    case '3-day':
    case '1-day':
      // Assume spend rate proportional to impression rate (simplified)
      dailySpendRate = spend / 30; // Rough daily spend estimate
      break;
    default:
      return 0;
  }
  
  const projectedSpend = spend + (dailySpendRate * daysLeft);
  
  if (projectedSpend <= budget) return 5; // On track
  return 0; // Overspend risk
}

// New function to calculate time-based completion percentage
export function calculateTimeBasedCompletion(campaignData: any[]): {
  completionPercentage: number;
  startDate: string | null;
  endDate: string | null;
  daysElapsed: number;
  totalDays: number;
} {
  if (campaignData.length === 0) {
    return {
      completionPercentage: 0,
      startDate: null,
      endDate: null,
      daysElapsed: 0,
      totalDays: 0
    };
  }

  // Extract and sort dates
  const dates = campaignData
    .map(row => row.DATE)
    .filter(date => date && date !== 'Totals')
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (dates.length === 0) {
    return {
      completionPercentage: 0,
      startDate: null,
      endDate: null,
      daysElapsed: 0,
      totalDays: 0
    };
  }

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const currentDate = new Date();
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  
  // Calculate total campaign duration in days
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  // Calculate days elapsed from start to today (but cap at campaign end)
  let daysElapsed: number;
  let completionPercentage: number;
  
  if (today <= start) {
    // Campaign hasn't started yet
    daysElapsed = 0;
    completionPercentage = 0;
  } else if (today >= end) {
    // Campaign has completed
    daysElapsed = totalDays;
    completionPercentage = 100;
  } else {
    // Campaign is in progress
    daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    completionPercentage = (daysElapsed / totalDays) * 100;
  }

  console.log(`Campaign completion calculation:`, {
    startDate,
    endDate,
    today: today.toISOString(),
    daysElapsed,
    totalDays,
    completionPercentage
  });

  return {
    completionPercentage: Math.round(completionPercentage * 10) / 10, // Round to 1 decimal
    startDate,
    endDate,
    daysElapsed,
    totalDays
  };
}

// Remove the old calculateCompletionPercentage function and update calculateCampaignHealth
export function calculateCampaignHealth(data: any[], campaignName: string, allCampaignImpressions?: number[]): CampaignHealthData {
  // Aggregate campaign data
  const campaignRows = data.filter(row => 
    row["CAMPAIGN ORDER NAME"] === campaignName && row.DATE !== 'Totals'
  );
  
  if (campaignRows.length === 0) {
    return {
      campaignName,
      spend: 0,
      impressions: 0,
      clicks: 0,
      revenue: 0,
      transactions: 0,
      roasScore: 0,
      deliveryPacingScore: 0,
      burnRateScore: 0,
      ctrScore: 0,
      overspendScore: 0,
      healthScore: 0,
      burnRateConfidence: 'no-data',
      ctr: 0,
      roas: 0,
      completionPercentage: 0
    };
  }
  
  // Sum up totals
  const totals = campaignRows.reduce((acc, row) => ({
    spend: acc.spend + (Number(row.SPEND) || 0),
    impressions: acc.impressions + (Number(row.IMPRESSIONS) || 0),
    clicks: acc.clicks + (Number(row.CLICKS) || 0),
    revenue: acc.revenue + (Number(row.REVENUE) || 0),
    transactions: acc.transactions + (Number(row.TRANSACTIONS) || 0)
  }), { spend: 0, impressions: 0, clicks: 0, revenue: 0, transactions: 0 });
  
  // Calculate derived metrics
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  
  // Calculate time-based completion percentage
  const timeCompletion = calculateTimeBasedCompletion(campaignRows);
  
  // Calculate scores
  const roasScore = calculateROASScore(roas);
  const ctrScore = calculateCTRScore(ctr);
  
  // For now, use simplified pacing and burn rate (can be enhanced with real pacing data)
  const expectedImpressions = totals.impressions * 1.1; // Assume 110% target for demo
  const deliveryPacingScore = calculateDeliveryPacingScore(totals.impressions, expectedImpressions);
  
  const burnRate = calculateBurnRate(data, campaignName);
  const requiredDailyImpressions = totals.impressions / campaignRows.length; // Simplified
  const burnRateScore = calculateBurnRateScore(burnRate, requiredDailyImpressions);
  
  const overspendScore = 5; // Simplified - assume on track for now
  
  // Calculate final health score with weights
  const healthScore = 
    (roasScore * 0.40) +
    (deliveryPacingScore * 0.30) +
    (burnRateScore * 0.15) +
    (ctrScore * 0.10) +
    (overspendScore * 0.05);
  
  const pace = expectedImpressions > 0 ? (totals.impressions / expectedImpressions) * 100 : 0;
  
  return {
    campaignName,
    budget: undefined, // Will be enhanced when budget data is available
    spend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    revenue: totals.revenue,
    transactions: totals.transactions,
    expectedImpressions,
    campaignStartDate: timeCompletion.startDate,
    campaignEndDate: timeCompletion.endDate,
    daysElapsed: timeCompletion.daysElapsed,
    totalDays: timeCompletion.totalDays,
    roasScore,
    deliveryPacingScore,
    burnRateScore,
    ctrScore,
    overspendScore,
    healthScore: Math.round(healthScore * 10) / 10, // Round to 1 decimal
    burnRateConfidence: burnRate.confidence,
    pace,
    ctr,
    roas,
    completionPercentage: timeCompletion.completionPercentage
  };
}

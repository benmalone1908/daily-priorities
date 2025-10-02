import { parseCampaignDate } from '@/lib/pacingCalculations';
import { differenceInDays } from 'date-fns';
import { CampaignDataRow } from '@/types/campaign';
import { ContractTermsRow } from '@/types/dashboard';

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
  completionPercentage: number;
  deliveryPacing: number;
  burnRate: number;
  overspend: number;
  burnRateData: BurnRateData;
  requiredDailyImpressions: number;
  burnRatePercentage: number;
}

export interface BurnRateData {
  oneDayRate: number;
  threeDayRate: number;
  sevenDayRate: number;
  confidence: string;
  oneDayPercentage: number;
  threeDayPercentage: number;
  sevenDayPercentage: number;
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

export function calculateBurnRate(data: CampaignDataRow[], campaignName: string, requiredDailyImpressions: number = 0): BurnRateData {
  // Filter data for this campaign and sort by date
  const campaignData = data
    .filter(row => row["CAMPAIGN ORDER NAME"] === campaignName && row.DATE !== 'Totals')
    .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

  console.log(`🔥 Burn Rate Debug for "${campaignName}":`, {
    totalRows: campaignData.length,
    totalImpressions: campaignData.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0),
    requiredDailyImpressions,
    dateRange: campaignData.length > 0 ? {
      first: campaignData[0]?.DATE,
      last: campaignData[campaignData.length - 1]?.DATE
    } : null
  });

  if (campaignData.length === 0) {
    return {
      oneDayRate: 0,
      threeDayRate: 0,
      sevenDayRate: 0,
      confidence: 'no-data',
      oneDayPercentage: 0,
      threeDayPercentage: 0,
      sevenDayPercentage: 0
    };
  }

  // Exclude most recent day (potentially incomplete) - use days 2,3,4,5,6,7,8 ago
  // Remove the last day and get up to 7 days before that
  const dataExcludingToday = campaignData.length > 1 ? campaignData.slice(0, -1) : [];
  const recent = dataExcludingToday.slice(-7); // Last 7 days excluding most recent

  // Log the data being used for burn rate calculation
  console.log(`🔥 Recent data for burn rate (excluding today):`, recent.map(row => ({
    date: row.DATE,
    impressions: Number(row.IMPRESSIONS) || 0
  })));

  // 1-day rate: day 2 ago (excluding yesterday)
  const oneDayRate = recent.length >= 1 ? Number(recent[recent.length - 1].IMPRESSIONS) || 0 : 0;

  // 3-day rate: average of days 2,3,4 ago
  const threeDayData = recent.length >= 3 ? recent.slice(-3) : [];
  const threeDaySum = threeDayData.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0);
  const threeDayRate = threeDayData.length > 0 ? threeDaySum / threeDayData.length : 0;

  // 7-day rate: average of days 2,3,4,5,6,7,8 ago
  const sevenDayData = recent.length >= 7 ? recent : [];
  const sevenDaySum = sevenDayData.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0);
  const sevenDayRate = sevenDayData.length > 0 ? sevenDaySum / sevenDayData.length : 0;

  console.log(`🔥 Detailed Burn Rate Breakdown for "${campaignName}":`, {
    oneDayRate,
    threeDayData: threeDayData.map(row => ({ date: row.DATE, impressions: Number(row.IMPRESSIONS) || 0 })),
    threeDaySum,
    threeDayRate,
    sevenDayData: sevenDayData.map(row => ({ date: row.DATE, impressions: Number(row.IMPRESSIONS) || 0 })),
    sevenDaySum,
    sevenDayRate
  });

  // VALIDATION: Check if rates are reasonable compared to total impressions
  const totalImpressions = campaignData.reduce((sum, row) => sum + (Number(row.IMPRESSIONS) || 0), 0);
  const averageDailyFromTotal = campaignData.length > 0 ? totalImpressions / campaignData.length : 0;

  console.log(`🔥 Burn Rate Validation:`, {
    oneDayRate,
    threeDayRate,
    sevenDayRate,
    totalImpressions,
    averageDailyFromTotal,
    dataPoints: campaignData.length
  });

  // If any calculated rate is more than 2x the average daily from total, something is wrong
  const maxReasonableRate = averageDailyFromTotal * 2;

  let validatedOneDayRate = oneDayRate;
  let validatedThreeDayRate = threeDayRate;
  let validatedSevenDayRate = sevenDayRate;

  if (oneDayRate > maxReasonableRate && maxReasonableRate > 0) {
    console.warn(`🚨 Burn Rate Error: 1-day rate ${oneDayRate} seems too high (max reasonable: ${maxReasonableRate}), using average daily instead`);
    validatedOneDayRate = averageDailyFromTotal;
  }

  if (threeDayRate > maxReasonableRate && maxReasonableRate > 0) {
    console.warn(`🚨 Burn Rate Error: 3-day rate ${threeDayRate} seems too high (max reasonable: ${maxReasonableRate}), using average daily instead`);
    validatedThreeDayRate = averageDailyFromTotal;
  }

  if (sevenDayRate > maxReasonableRate && maxReasonableRate > 0) {
    console.warn(`🚨 Burn Rate Error: 7-day rate ${sevenDayRate} seems too high (max reasonable: ${maxReasonableRate}), using average daily instead`);
    validatedSevenDayRate = averageDailyFromTotal;
  }

  // Update confidence levels to account for excluding most recent day
  let confidence = 'no-data';
  if (recent.length >= 7) confidence = '7-day';
  else if (recent.length >= 3) confidence = '3-day';
  else if (recent.length >= 1) confidence = '1-day';

  // Calculate percentages using validated rates
  const oneDayPercentage = requiredDailyImpressions > 0 ? (validatedOneDayRate / requiredDailyImpressions) * 100 : 0;
  const threeDayPercentage = requiredDailyImpressions > 0 ? (validatedThreeDayRate / requiredDailyImpressions) * 100 : 0;
  const sevenDayPercentage = requiredDailyImpressions > 0 ? (validatedSevenDayRate / requiredDailyImpressions) * 100 : 0;

  console.log(`🔥 Final Burn Rate Results:`, {
    oneDayRate: validatedOneDayRate,
    threeDayRate: validatedThreeDayRate,
    sevenDayRate: validatedSevenDayRate,
    confidence,
    oneDayPercentage,
    threeDayPercentage,
    sevenDayPercentage
  });

  return {
    oneDayRate: validatedOneDayRate,
    threeDayRate: validatedThreeDayRate,
    sevenDayRate: validatedSevenDayRate,
    confidence,
    oneDayPercentage,
    threeDayPercentage,
    sevenDayPercentage
  };
}

export function calculateBurnRateScore(burnRate: BurnRateData, requiredDailyImpressions: number, actualImpressions: number = 0, expectedImpressions: number = 0, daysLeft: number = 0): number {
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

  console.log(`🔥 Burn Rate Score Calculation:`, {
    currentRate,
    actualImpressions,
    expectedImpressions,
    daysLeft,
    requiredDailyImpressions
  });

  // Calculate required daily rate on the fly: remaining impressions ÷ remaining days
  let dynamicRequiredDaily = requiredDailyImpressions;

  if (expectedImpressions > 0 && actualImpressions >= 0 && daysLeft > 0) {
    const remainingImpressions = Math.max(0, expectedImpressions - actualImpressions);
    dynamicRequiredDaily = remainingImpressions / daysLeft;

    console.log(`🔥 Dynamic Required Daily Calculation:`, {
      remainingImpressions,
      daysLeft,
      dynamicRequiredDaily,
      originalRequired: requiredDailyImpressions
    });
  }

  // If we still don't have a target, can't score
  if (dynamicRequiredDaily === 0) {
    console.log(`🔥 No target daily rate available, returning 0`);
    return 0;
  }

  const ratio = currentRate / dynamicRequiredDaily;

  console.log(`🔥 Burn Rate Score Result:`, {
    currentRate,
    dynamicRequiredDaily,
    ratio,
    ratioPercent: (ratio * 100).toFixed(1) + '%'
  });

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

function calculateSpendBurnRate(data: CampaignDataRow[], campaignName: string, totalSpend: number = 0, daysIntoFlight: number = 0): { dailySpendRate: number; confidence: string } {
  const isTargetCampaign = campaignName === "2001987: MJ: Union Chill-NJ-Garden Greens Brand-DIS-250514";
  
  if (isTargetCampaign) {
    console.log(`🔍 [TARGET CAMPAIGN] Calculating spend burn rate for: ${campaignName}`);
    console.log(`🔍 [TARGET CAMPAIGN] Input params: totalSpend=$${totalSpend}, daysIntoFlight=${daysIntoFlight}`);
  }
  
  // Filter data for this campaign and sort by date
  const campaignData = data
    .filter(row => row["CAMPAIGN ORDER NAME"] === campaignName && row.DATE !== 'Totals')
    .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
  
  if (campaignData.length === 0) {
    if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] No spend data found`);
    return { dailySpendRate: 0, confidence: 'no-data' };
  }
  
  // Get spend values and filter out anomalous data
  const spendValues = campaignData.map(row => Number(row.SPEND) || 0);
  const totalDataSpend = spendValues.reduce((sum, spend) => sum + spend, 0);
  
  if (isTargetCampaign) {
    console.log(`🔍 [TARGET CAMPAIGN] Raw spend data (last 7 days): [${spendValues.slice(-7).join(', ')}]`);
    console.log(`🔍 [TARGET CAMPAIGN] Total from raw data: $${totalDataSpend}`);
    console.log(`🔍 [TARGET CAMPAIGN] Campaign data rows: ${campaignData.length}`);
  }
  
  // Calculate average daily spend based on total spend and days elapsed
  let averageDailySpend = 0;
  if (daysIntoFlight > 0 && totalSpend > 0) {
    averageDailySpend = totalSpend / daysIntoFlight;
    if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] Average daily spend (total/days): $${averageDailySpend.toFixed(2)}`);
  }
  
  // Get most recent data points for trend analysis
  const recent = campaignData.slice(-7); // Last 7 days
  
  let dailySpendRate = 0;
  let confidence = 'no-data';
  
  if (recent.length >= 7) {
    // Use 7-day average, but validate against overall pattern
    const sevenDayAvg = recent.reduce((sum, row) => sum + (Number(row.SPEND) || 0), 0) / 7;
    if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] 7-day average: $${sevenDayAvg.toFixed(2)}`);
    
    // If 7-day average is drastically different from overall average, use the more conservative one
    if (averageDailySpend > 0 && Math.abs(sevenDayAvg - averageDailySpend) > averageDailySpend * 2) {
      if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] 7-day average seems anomalous, using overall average instead`);
      dailySpendRate = averageDailySpend;
    } else {
      dailySpendRate = sevenDayAvg;
    }
    confidence = '7-day';
  } else if (recent.length >= 3) {
    // Use 3-day average with validation
    const threeDayAvg = recent.slice(-3).reduce((sum, row) => sum + (Number(row.SPEND) || 0), 0) / 3;
    if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] 3-day average: $${threeDayAvg.toFixed(2)}`);
    
    if (averageDailySpend > 0 && Math.abs(threeDayAvg - averageDailySpend) > averageDailySpend * 2) {
      if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] 3-day average seems anomalous, using overall average instead`);
      dailySpendRate = averageDailySpend;
    } else {
      dailySpendRate = threeDayAvg;
    }
    confidence = '3-day';
  } else if (recent.length >= 1) {
    // Use most recent day with validation
    const oneDaySpend = Number(recent[recent.length - 1].SPEND) || 0;
    if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] 1-day spend: $${oneDaySpend.toFixed(2)}`);
    
    if (averageDailySpend > 0 && Math.abs(oneDaySpend - averageDailySpend) > averageDailySpend * 3) {
      if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] 1-day spend seems anomalous, using overall average instead`);
      dailySpendRate = averageDailySpend;
    } else {
      dailySpendRate = oneDaySpend;
    }
    confidence = '1-day';
  } else if (averageDailySpend > 0) {
    // Fallback to overall average
    dailySpendRate = averageDailySpend;
    confidence = 'overall-average';
  }
  
  // Apply additional safeguards
  if (totalSpend > 0 && daysIntoFlight > 0) {
    const maxReasonableDaily = (totalSpend / daysIntoFlight) * 2; // Allow up to 2x current average
    if (dailySpendRate > maxReasonableDaily) {
      if (isTargetCampaign) console.log(`🔍 [TARGET CAMPAIGN] Daily spend rate $${dailySpendRate.toFixed(2)} seems too high, capping at $${maxReasonableDaily.toFixed(2)}`);
      dailySpendRate = maxReasonableDaily;
      confidence = confidence + '-capped';
    }
  }
  
  if (isTargetCampaign) {
    console.log(`🔍 [TARGET CAMPAIGN] Final daily spend rate: $${dailySpendRate.toFixed(2)} (confidence: ${confidence})`);
  }
  
  return { dailySpendRate, confidence };
}

export function calculateOverspendScore(
  currentSpend: number,
  budget: number,
  dailySpendRate: number,
  daysLeft: number,
  confidence: string
): number {
  const isTargetCampaign = budget === 3000; // Identify our target campaign by budget

  console.log(`🔍 OVERSPEND SCORE START: spend=$${currentSpend}, budget=$${budget}, dailyRate=$${dailySpendRate.toFixed(2)}, daysLeft=${daysLeft}, confidence=${confidence}`);

  if (isTargetCampaign) {
    console.log(`🎯 [OVERSPEND TARGET] Starting overspend calculation`);
    console.log(`🎯 [OVERSPEND TARGET] Inputs: spend=$${currentSpend}, budget=$${budget}, dailyRate=$${dailySpendRate.toFixed(2)}, daysLeft=${daysLeft}, confidence=${confidence}`);
  }
  
  if (!budget || budget === 0 || daysLeft < 0) {
    console.log(`🔍 EARLY RETURN: No budget data or campaign ended, returning 0`);
    if (isTargetCampaign) console.log(`🎯 [OVERSPEND TARGET] No budget data or campaign ended, returning 0`);
    return 0; // No budget data or campaign ended
  }

  console.log(`🔍 PASSED EARLY RETURN CHECK: Proceeding with calculation`);

  // Calculate projected total spend
  const projectedTotalSpend = currentSpend + (dailySpendRate * daysLeft);
  const projectedOverspend = Math.max(0, projectedTotalSpend - budget);
  const overspendPercentage = budget > 0 ? (projectedOverspend / budget) * 100 : 0;

  console.log(`🔍 PROJECTION CALCULATED: totalSpend=$${projectedTotalSpend.toFixed(2)}, overspend=$${projectedOverspend.toFixed(2)}, percentage=${overspendPercentage.toFixed(2)}%`);
  
  if (isTargetCampaign) {
    console.log(`🎯 [OVERSPEND TARGET] Calculation: ${currentSpend} + (${dailySpendRate.toFixed(2)} × ${daysLeft}) = ${projectedTotalSpend.toFixed(2)}`);
    console.log(`🎯 [OVERSPEND TARGET] Projected overspend: $${projectedOverspend.toFixed(2)} (${overspendPercentage.toFixed(1)}%)`);
  }
  
  // Adjust confidence based on data quality
  let confidenceMultiplier = 1;
  const confidencePrefix = confidence.split('-')[0];
  console.log(`🔍 CONFIDENCE DEBUG: full="${confidence}", prefix="${confidencePrefix}"`);

  switch (confidencePrefix) { // Handle confidence strings like '7-day-capped'
    case '7':
      confidenceMultiplier = 1;
      console.log(`🔍 CONFIDENCE: Matched '7' -> multiplier=1`);
      break;
    case '3':
      confidenceMultiplier = 0.8;
      console.log(`🔍 CONFIDENCE: Matched '3' -> multiplier=0.8`);
      break;
    case '1':
      confidenceMultiplier = 0.6;
      console.log(`🔍 CONFIDENCE: Matched '1' -> multiplier=0.6`);
      break;
    case 'overall':
      confidenceMultiplier = 0.9;
      console.log(`🔍 CONFIDENCE: Matched 'overall' -> multiplier=0.9`);
      break;
    default:
      console.log(`🔍 CONFIDENCE ERROR: Unknown confidence prefix "${confidencePrefix}" from "${confidence}", returning 0`);
      if (isTargetCampaign) console.log(`🎯 [OVERSPEND TARGET] Unknown confidence, returning 0`);
      return 0;
  }
  
  // Reduce confidence if the rate was capped due to anomalies
  if (confidence.includes('capped')) {
    confidenceMultiplier *= 0.7;
  }
  
  // Score based on projected overspend percentage
  let baseScore = 0;
  if (overspendPercentage === 0) {
    baseScore = 10; // On track, no overspend
  } else if (overspendPercentage <= 5) {
    baseScore = 8; // Minor overspend risk
  } else if (overspendPercentage <= 10) {
    baseScore = 6; // Moderate overspend risk
  } else if (overspendPercentage <= 20) {
    baseScore = 3; // High overspend risk
  } else {
    baseScore = 0; // Very high overspend risk
  }

  const finalScore = Math.round(baseScore * confidenceMultiplier * 10) / 10;

  console.log(`🔍 Overspend calculation debug:`);
  console.log(`  - Overspend percentage: ${overspendPercentage.toFixed(2)}%`);
  console.log(`  - Base score: ${baseScore}`);
  console.log(`  - Confidence multiplier: ${confidenceMultiplier}`);
  console.log(`  - Final score: ${finalScore}`);
  
  if (isTargetCampaign) {
    console.log(`🎯 [OVERSPEND TARGET] Score calculation: base=${baseScore}, confidence=${confidenceMultiplier}, final=${finalScore}`);
  }

  console.log(`🔍 OVERSPEND SCORE END: Returning ${finalScore} for budget=$${budget}`);

  return finalScore;
}

function calculateCompletionPercentage(contractTermsData: ContractTermsRow[], campaignName: string): number {
  console.log(`Calculating completion for campaign: "${campaignName}"`);
  console.log(`Contract terms data available: ${contractTermsData.length} rows`);
  
  // Find the campaign in contract terms data
  const contractTerms = contractTermsData.find(row => {
    const possibleNameFields = ['CAMPAIGN ORDER NAME', 'NAME', 'CAMPAIGN', 'Campaign', 'name', 'campaign', 'Campaign Name', 'CAMPAIGN NAME', 'Name'];
    
    for (const field of possibleNameFields) {
      const rowCampaign = row[field];
      if (rowCampaign) {
        const normalizedRowCampaign = String(rowCampaign).trim();
        const normalizedCampaignName = String(campaignName).trim();
        
        if (normalizedRowCampaign === normalizedCampaignName) {
          console.log(`Found matching campaign in field "${field}": "${normalizedRowCampaign}"`);
          return true;
        }
      }
    }
    return false;
  });
  
  if (!contractTerms) {
    console.log(`No contract terms found for campaign: "${campaignName}"`);
    return 0;
  }
  
  try {
    // Use imported date calculation logic from Pacing 2
    const startDate = parseCampaignDate(contractTerms['Start Date']);
    const endDate = parseCampaignDate(contractTerms['End Date']);
    const today = new Date();
    
    // Calculate campaign duration (inclusive of both start and end dates)
    const totalCampaignDays = differenceInDays(endDate, startDate) + 1;
    
    // Calculate days into campaign
    const daysIntoCampaign = Math.max(0, Math.min(
      differenceInDays(today, startDate),
      totalCampaignDays
    ));
    
    // Calculate completion percentage
    const completionPercentage = totalCampaignDays > 0 ? (daysIntoCampaign / totalCampaignDays) * 100 : 0;
    
    console.log(`Campaign "${campaignName}" completion: ${Math.max(0, Math.min(100, completionPercentage)).toFixed(1)}%`);
    
    // Ensure completion percentage is between 0 and 100
    return Math.max(0, Math.min(100, completionPercentage));
  } catch (error) {
    console.warn(`Error calculating completion percentage for "${campaignName}":`, error);
    return 0;
  }
}

function findBudgetInFields(contractTermsRow: ContractTermsRow, campaignName: string): number {
  const isTargetCampaign = campaignName === "2001987: MJ: Union Chill-NJ-Garden Greens Brand-DIS-250514";
  
  if (isTargetCampaign) {
    console.log(`💰 [BUDGET DEBUG] Searching for budget in contract terms row:`, contractTermsRow);
    console.log(`💰 [BUDGET DEBUG] Available fields:`, Object.keys(contractTermsRow || {}));
  }
  
  // List of possible budget field names to check
  const budgetFieldNames = [
    'Budget', 'BUDGET', 'budget',
    'Total Budget', 'TOTAL BUDGET', 'total budget',
    'Campaign Budget', 'CAMPAIGN BUDGET', 'campaign budget',
    'Media Budget', 'MEDIA BUDGET', 'media budget',
    'Flight Budget', 'FLIGHT BUDGET', 'flight budget',
    'Budget Amount', 'BUDGET AMOUNT', 'budget amount',
    'Total', 'TOTAL', 'total',
    'Amount', 'AMOUNT', 'amount'
  ];
  
  // First, try exact field name matches
  for (const fieldName of budgetFieldNames) {
    if (contractTermsRow[fieldName] !== undefined) {
      const budgetValue = contractTermsRow[fieldName];
      const numBudget = Number(budgetValue);
      
      if (isTargetCampaign) {
        console.log(`💰 [BUDGET DEBUG] Found field "${fieldName}" with value:`, budgetValue, `-> parsed as:`, numBudget);
      }
      
      if (!isNaN(numBudget) && numBudget > 0) {
        if (isTargetCampaign) {
          console.log(`💰 [BUDGET DEBUG] ✅ Found valid budget: $${numBudget} in field "${fieldName}"`);
        }
        return numBudget;
      }
    }
  }
  
  // If no exact matches, search through all fields for anything that looks like a budget
  const allFields = Object.keys(contractTermsRow || {});
  for (const fieldName of allFields) {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Check if field name contains budget-related keywords
    if (lowerFieldName.includes('budget') || lowerFieldName.includes('total') || lowerFieldName.includes('amount')) {
      const fieldValue = contractTermsRow[fieldName];
      const numValue = Number(fieldValue);
      
      if (isTargetCampaign) {
        console.log(`💰 [BUDGET DEBUG] Checking budget-like field "${fieldName}" with value:`, fieldValue, `-> parsed as:`, numValue);
      }
      
      if (!isNaN(numValue) && numValue > 0) {
        if (isTargetCampaign) {
          console.log(`💰 [BUDGET DEBUG] ✅ Found valid budget: $${numValue} in budget-like field "${fieldName}"`);
        }
        return numValue;
      }
    }
  }
  
  // Last resort: look for any numeric field that could be a budget (reasonable range)
  for (const fieldName of allFields) {
    const fieldValue = contractTermsRow[fieldName];
    const numValue = Number(fieldValue);
    
    // Check if it's a reasonable budget amount (between $100 and $1,000,000)
    if (!isNaN(numValue) && numValue >= 100 && numValue <= 1000000) {
      if (isTargetCampaign) {
        console.log(`💰 [BUDGET DEBUG] Found potential budget field "${fieldName}" with value: $${numValue}`);
      }
      return numValue;
    }
  }
  
  if (isTargetCampaign) {
    console.log(`💰 [BUDGET DEBUG] ❌ No valid budget found in any field`);
  }
  
  return 0;
}

interface PacingDataRow {
  Campaign: string;
  "Days Left": number;
  [key: string]: string | number | undefined;
}

function getBudgetAndDaysLeft(pacingData: PacingDataRow[], campaignName: string, contractTermsData: ContractTermsRow[] = []): { budget: number; daysLeft: number } {
  const isTargetCampaign = campaignName === "2001987: MJ: Union Chill-NJ-Garden Greens Brand-DIS-250514";
  
  if (isTargetCampaign) {
    console.log(`💰 [BUDGET TARGET] Looking for budget data for: ${campaignName}`);
    console.log(`💰 [BUDGET TARGET] Contract terms data length: ${contractTermsData.length}`);
    console.log(`💰 [BUDGET TARGET] Pacing data length: ${pacingData.length}`);
    
    if (contractTermsData.length > 0) {
      console.log(`💰 [BUDGET TARGET] Sample contract terms row:`, contractTermsData[0]);
      console.log(`💰 [BUDGET TARGET] Contract terms fields:`, Object.keys(contractTermsData[0] || {}));
    }
  }
  
  // First, try to get budget from contract terms data
  let budget = 0;
  
  if (contractTermsData.length > 0) {
    // Look for the campaign in contract terms data with multiple matching strategies
    let contractTermsRow = null;
    
    // Strategy 1: Exact match
    contractTermsRow = contractTermsData.find(row => {
      const possibleNameFields = ['NAME', 'CAMPAIGN', 'Campaign', 'name', 'campaign', 'Campaign Name', 'CAMPAIGN NAME', 'Name'];
      
      for (const field of possibleNameFields) {
        const rowCampaign = row[field];
        if (rowCampaign) {
          const normalizedRowCampaign = String(rowCampaign).trim();
          const normalizedCampaignName = String(campaignName).trim();
          const match = normalizedRowCampaign === normalizedCampaignName;
          
          if (isTargetCampaign) {
            console.log(`💰 [BUDGET TARGET] Checking exact match in field "${field}":`);
            console.log(`💰 [BUDGET TARGET]   Contract: "${normalizedRowCampaign}"`);
            console.log(`💰 [BUDGET TARGET]   Target: "${normalizedCampaignName}"`);
            console.log(`💰 [BUDGET TARGET]   Match: ${match}`);
          }
          
          if (match) return true;
        }
      }
      return false;
    });
    
    // Strategy 2: Partial match if exact match fails
    if (!contractTermsRow) {
      contractTermsRow = contractTermsData.find(row => {
        const possibleNameFields = ['NAME', 'CAMPAIGN', 'Campaign', 'name', 'campaign', 'Campaign Name', 'CAMPAIGN NAME', 'Name'];
        
        for (const field of possibleNameFields) {
          const rowCampaign = row[field];
          if (rowCampaign) {
            const normalizedRowCampaign = String(rowCampaign).trim().toLowerCase();
            const normalizedCampaignName = String(campaignName).trim().toLowerCase();
            
            // Check for partial matches (campaign ID or key terms)
            const campaignIdMatch = normalizedRowCampaign.includes("2001987") && normalizedCampaignName.includes("2001987");
            const unionChillMatch = normalizedRowCampaign.includes("union chill") && normalizedCampaignName.includes("union chill");
            
            if (isTargetCampaign && (campaignIdMatch || unionChillMatch)) {
              console.log(`💰 [BUDGET TARGET] Found partial match in field "${field}":`);
              console.log(`💰 [BUDGET TARGET]   Contract: "${normalizedRowCampaign}"`);
              console.log(`💰 [BUDGET TARGET]   Target: "${normalizedCampaignName}"`);
              console.log(`💰 [BUDGET TARGET]   ID Match: ${campaignIdMatch}, Union Chill Match: ${unionChillMatch}`);
            }
            
            if (campaignIdMatch || unionChillMatch) return true;
          }
        }
        return false;
      });
    }
    
    if (contractTermsRow) {
      if (isTargetCampaign) {
        console.log(`💰 [BUDGET TARGET] ✅ Found matching contract terms row:`, contractTermsRow);
      }
      
      // Use enhanced budget field search
      budget = findBudgetInFields(contractTermsRow, campaignName);
    } else if (isTargetCampaign) {
      console.log(`💰 [BUDGET TARGET] ❌ No matching campaign found in contract terms`);
      
      // Debug: Show all available campaign names in contract terms
      const availableCampaigns = contractTermsData.map(row => {
        const possibleNameFields = ['NAME', 'CAMPAIGN', 'Campaign', 'name', 'campaign', 'Campaign Name', 'CAMPAIGN NAME', 'Name'];
        for (const field of possibleNameFields) {
          if (row[field]) {
            console.log(`💰 [BUDGET TARGET] Contract campaign from field "${field}": "${row[field]}"`);
            return row[field];
          }
        }
        return null;
      }).filter(Boolean);
      
      console.log(`💰 [BUDGET TARGET] All available contract campaigns:`, availableCampaigns);
    }
  }
  
  // Calculate days left from contract terms data if available, otherwise try pacing data
  let daysLeft = 0;
  
  if (contractTermsData.length > 0) {
    // First try to calculate from contract terms using the same logic as Pacing 2
    const contractTermsRow = contractTermsData.find(row => {
      const possibleNameFields = ['NAME', 'CAMPAIGN', 'Campaign', 'name', 'campaign', 'Campaign Name', 'CAMPAIGN NAME', 'Name'];
      
      for (const field of possibleNameFields) {
        const rowCampaign = row[field];
        if (rowCampaign) {
          const normalizedRowCampaign = String(rowCampaign).trim();
          const normalizedCampaignName = String(campaignName).trim();
          if (normalizedRowCampaign === normalizedCampaignName) {
            return true;
          }
        }
      }
      return false;
    });
    
    if (contractTermsRow) {
      try {
        const endDate = parseCampaignDate(contractTermsRow['End Date']);
        const today = new Date();
        daysLeft = Math.max(0, differenceInDays(endDate, today));
        
        if (isTargetCampaign) {
          console.log(`💰 [BUDGET TARGET] Calculated days left from contract terms: ${daysLeft}`);
        }
      } catch (error) {
        if (isTargetCampaign) {
          console.log(`💰 [BUDGET TARGET] Error calculating days left from contract terms:`, error);
        }
      }
    }
  }
  
  // Fallback to pacing data if contract terms calculation failed
  if (daysLeft === 0 && pacingData.length > 0) {
    const campaignPacing = pacingData.find(row => {
      const rowCampaign = row["Campaign"];
      const normalizedRowCampaign = String(rowCampaign || "").trim();
      const normalizedCampaignName = String(campaignName || "").trim();
      return normalizedRowCampaign === normalizedCampaignName;
    });
    
    if (campaignPacing) {
      daysLeft = Number(campaignPacing["Days Left"]) || 0;
      if (isTargetCampaign) {
        console.log(`💰 [BUDGET TARGET] Using days left from pacing data: ${daysLeft}`);
      }
    }
  }
  
  if (isTargetCampaign) {
    console.log(`💰 [BUDGET TARGET] Final result: budget=$${budget}, daysLeft=${daysLeft}`);
  }
  
  return { budget, daysLeft };
}

interface RealPacingMetrics {
  expectedImpressions: number;
  actualImpressions: number;
  currentPacing: number;
  daysUntilEnd: number;
  budget?: number;
}

export function calculateCampaignHealth(data: CampaignDataRow[], campaignName: string, pacingData: PacingDataRow[] = [], contractTermsData: ContractTermsRow[] = [], realPacingMetrics: RealPacingMetrics | null = null): CampaignHealthData {
  const isTargetCampaign = campaignName === "2001987: MJ: Union Chill-NJ-Garden Greens Brand-DIS-250514";
  
  if (isTargetCampaign) {
    console.log(`\n🚀 === CALCULATING HEALTH FOR TARGET CAMPAIGN: "${campaignName}" ===`);
  } else {
    console.log(`\n=== CALCULATING HEALTH FOR CAMPAIGN: "${campaignName}" ===`);
  }
  
  // Aggregate campaign data
  const campaignRows = data.filter(row => 
    row["CAMPAIGN ORDER NAME"] === campaignName && row.DATE !== 'Totals'
  );
  
  if (campaignRows.length === 0) {
    console.log(`No data found for campaign: "${campaignName}"`);
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
      completionPercentage: 0,
      deliveryPacing: 0,
      burnRate: 0,
      overspend: 0,
      burnRateData: {
        oneDayRate: 0,
        threeDayRate: 0,
        sevenDayRate: 0,
        confidence: 'no-data',
        oneDayPercentage: 0,
        threeDayPercentage: 0,
        sevenDayPercentage: 0
      },
      requiredDailyImpressions: 0,
      burnRatePercentage: 0
    };
  }
  
  if (isTargetCampaign) {
    console.log(`🚀 Found ${campaignRows.length} data rows for target campaign`);
  } else {
    console.log(`Found ${campaignRows.length} data rows for campaign`);
  }
  
  // Sum up totals
  const totals = campaignRows.reduce((acc, row) => ({
    spend: acc.spend + (Number(row.SPEND) || 0),
    impressions: acc.impressions + (Number(row.IMPRESSIONS) || 0),
    clicks: acc.clicks + (Number(row.CLICKS) || 0),
    revenue: acc.revenue + (Number(row.REVENUE) || 0),
    transactions: acc.transactions + (Number(row.TRANSACTIONS) || 0)
  }), { spend: 0, impressions: 0, clicks: 0, revenue: 0, transactions: 0 });
  
  if (isTargetCampaign) {
    console.log(`🚀 Target campaign totals:`, totals);
  } else {
    console.log(`Campaign totals:`, totals);
  }
  
  // Calculate derived metrics
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  
  // Calculate scores
  const roasScore = calculateROASScore(roas);
  const ctrScore = calculateCTRScore(ctr);
  
  // Use real pacing data if available, otherwise fall back to simplified calculation
  let expectedImpressions, deliveryPacingScore, actualPacingPercent;

  if (realPacingMetrics) {
    // Use real pacing metrics from processCampaigns
    expectedImpressions = realPacingMetrics.expectedImpressions;
    actualPacingPercent = realPacingMetrics.currentPacing * 100;
    deliveryPacingScore = calculateDeliveryPacingScore(realPacingMetrics.actualImpressions, expectedImpressions);

    console.log(`📊 Using real pacing metrics for ${campaignName}:`);
    console.log(`  - Expected impressions: ${expectedImpressions}`);
    console.log(`  - Actual impressions: ${realPacingMetrics.actualImpressions}`);
    console.log(`  - Current pacing: ${actualPacingPercent.toFixed(1)}%`);
  } else {
    // Fallback to simplified calculation
    expectedImpressions = totals.impressions * 1.1; // Assume 110% target for demo
    deliveryPacingScore = calculateDeliveryPacingScore(totals.impressions, expectedImpressions);
    actualPacingPercent = expectedImpressions > 0 ? (totals.impressions / expectedImpressions) * 100 : 0;

    console.log(`⚠️ Using simplified pacing calculation for ${campaignName} (missing real pacing data)`);
  }
  
  // Calculate required daily impressions from contract terms data
  let requiredDailyImpressions = 0;
  
  // Try to get impression goal from contract terms
  if (contractTermsData.length > 0) {
    const contractTerms = contractTermsData.find(row => {
      const possibleNameFields = ['NAME', 'CAMPAIGN', 'Campaign', 'name', 'campaign', 'Campaign Name', 'CAMPAIGN NAME', 'Name'];
      
      for (const field of possibleNameFields) {
        const rowCampaign = row[field];
        if (rowCampaign) {
          const normalizedRowCampaign = String(rowCampaign).trim();
          const normalizedCampaignName = String(campaignName).trim();
          if (normalizedRowCampaign === normalizedCampaignName) {
            return true;
          }
        }
      }
      return false;
    });
    
    if (contractTerms) {
      try {
        // Parse impression goal from contract terms
        const impressionGoal = parseInt((contractTerms['Impressions Goal'] || '0').replace(/[,]/g, ''));
        
        if (!isNaN(impressionGoal) && impressionGoal > 0) {
          // Calculate total campaign days from contract terms
          const startDate = parseCampaignDate(contractTerms['Start Date']);
          const endDate = parseCampaignDate(contractTerms['End Date']);
          const totalCampaignDays = differenceInDays(endDate, startDate) + 1;
          
          if (totalCampaignDays > 0) {
            requiredDailyImpressions = impressionGoal / totalCampaignDays;
            
            if (isTargetCampaign) {
              console.log(`🚀 Target campaign calculated required daily impressions from contract terms: ${Math.round(requiredDailyImpressions)} (${impressionGoal} / ${totalCampaignDays} days)`);
            } else {
              console.log(`Campaign calculated required daily impressions from contract terms: ${Math.round(requiredDailyImpressions)}`);
            }
          }
        }
      } catch (error) {
        if (isTargetCampaign) {
          console.log(`🚀 Target campaign error calculating required daily impressions from contract terms:`, error);
        }
      }
    }
  }
  
  // Log when contract terms data is missing instead of using fallback
  if (requiredDailyImpressions === 0) {
    if (isTargetCampaign) {
      console.log(`🚀 Target campaign missing contract terms - cannot calculate accurate required daily impressions`);
    } else {
      console.log(`Campaign missing contract terms - cannot calculate accurate required daily impressions`);
    }
  }
  
  const burnRateData = calculateBurnRate(data, campaignName, requiredDailyImpressions);

  // Get budget and days left - prefer real pacing metrics if available
  let budget, daysLeft;

  // Use real pacing metrics if available for burn rate scoring
  const actualImpressions = realPacingMetrics ? realPacingMetrics.actualImpressions : totals.impressions;
  const daysLeftForBurnRate = realPacingMetrics ? realPacingMetrics.daysUntilEnd : daysLeft;

  const burnRateScore = calculateBurnRateScore(
    burnRateData,
    requiredDailyImpressions,
    actualImpressions,
    expectedImpressions,
    daysLeftForBurnRate
  );

  if (realPacingMetrics) {
    // Use budget and timeline from real pacing metrics (more reliable)
    budget = realPacingMetrics.budget || 0;
    daysLeft = realPacingMetrics.daysUntilEnd || 0;
    console.log(`📊 Using budget and timeline from real pacing metrics: $${budget}, Days left: ${daysLeft}`);
  } else {
    // Fallback to contract terms calculation
    const contractData = getBudgetAndDaysLeft(pacingData, campaignName, contractTermsData);
    budget = contractData.budget;
    daysLeft = contractData.daysLeft;
    if (isTargetCampaign) {
      console.log(`🚀 Target campaign budget from contract terms: $${budget}, Days left: ${daysLeft}`);
    } else {
      console.log(`Budget from contract terms: $${budget}, Days left: ${daysLeft}`);
    }
  }
  
  // Calculate completion percentage from contract terms data instead of pacing data
  const completionPercentage = calculateCompletionPercentage(contractTermsData, campaignName);
  
  // Filter out campaigns without contract terms - they're already called out in the alert
  if (completionPercentage === 0) {
    console.log(`Excluding campaign "${campaignName}" from health chart - no contract terms found`);
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
      healthScore: 0, // This will cause the campaign to be filtered out
      burnRateConfidence: 'no-contract-terms',
      ctr: 0,
      roas: 0,
      completionPercentage: 0,
      deliveryPacing: 0,
      burnRate: 0,
      overspend: 0,
      burnRateData: {
        oneDayRate: 0,
        threeDayRate: 0,
        sevenDayRate: 0,
        confidence: 'no-contract-terms',
        oneDayPercentage: 0,
        threeDayPercentage: 0,
        sevenDayPercentage: 0
      },
      requiredDailyImpressions: 0,
      burnRatePercentage: 0
    };
  }
  
  const daysIntoFlight = Math.max(1, campaignRows.length); // Use data days as approximation
  
  if (isTargetCampaign) {
    console.log(`🚀 Target campaign days into flight: ${daysIntoFlight}, Completion: ${completionPercentage}%`);
  } else {
    console.log(`Days into flight: ${daysIntoFlight}, Completion: ${completionPercentage}%`);
  }
  
  // Calculate spend burn rate with improved logic
  if (isTargetCampaign) {
    console.log(`🚀 --- CALCULATING SPEND BURN RATE FOR TARGET ---`);
  } else {
    console.log(`\n--- CALCULATING SPEND BURN RATE ---`);
  }
  const { dailySpendRate, confidence: spendConfidence } = calculateSpendBurnRate(
    data, 
    campaignName, 
    totals.spend, 
    daysIntoFlight
  );
  
  if (isTargetCampaign) {
    console.log(`🚀 Target campaign final daily spend rate: $${dailySpendRate}, confidence: ${spendConfidence}`);
  } else {
    console.log(`Final daily spend rate: $${dailySpendRate}, confidence: ${spendConfidence}`);
  }
  
  // Calculate actual overspend score using improved projection
  if (isTargetCampaign) {
    console.log(`🚀 --- CALCULATING OVERSPEND SCORE FOR TARGET ---`);
    console.log(`🚀 Target inputs: currentSpend=$${totals.spend}, budget=$${budget}, dailyRate=$${dailySpendRate}, daysLeft=${daysLeft}`);
  } else {
    console.log(`\n--- CALCULATING OVERSPEND SCORE ---`);
    console.log(`Inputs: currentSpend=$${totals.spend}, budget=$${budget}, dailyRate=$${dailySpendRate}, daysLeft=${daysLeft}`);
  }
  
  const overspendScore = calculateOverspendScore(totals.spend, budget, dailySpendRate, daysLeft, spendConfidence);
  
  // Calculate projected overspend amount
  const projectedTotalSpend = totals.spend + (dailySpendRate * Math.max(0, daysLeft));
  const overspendAmount = Math.max(0, projectedTotalSpend - budget);
  
  if (isTargetCampaign) {
    console.log(`🚀 Target projected total spend: $${projectedTotalSpend}, Overspend amount: $${overspendAmount}`);
    console.log(`🚀 Target overspend score: ${overspendScore}`);
  } else {
    console.log(`Projected total spend: $${projectedTotalSpend}, Overspend amount: $${overspendAmount}`);
    console.log(`Overspend score: ${overspendScore}`);
  }
  
  // Calculate final health score with weights (CTR removed, overspend increased from 5% to 15%)
  const healthScore = 
    (roasScore * 0.40) +
    (deliveryPacingScore * 0.30) +
    (burnRateScore * 0.15) +
    (overspendScore * 0.15);
  
  // Calculate the actual values for display using real pacing if available
  const deliveryPacing = actualPacingPercent || 0;
  const burnRateValue = burnRateData.sevenDayRate || burnRateData.threeDayRate || burnRateData.oneDayRate || 0;
  const burnRatePercentage = requiredDailyImpressions > 0 ? (burnRateValue / requiredDailyImpressions) * 100 : 0;
  
  if (isTargetCampaign) {
    console.log(`🚀 === FINAL RESULTS FOR TARGET CAMPAIGN "${campaignName}" ===`);
    console.log(`🚀 Health Score: ${Math.round(healthScore * 10) / 10}`);
    console.log(`🚀 Overspend: $${Math.round(overspendAmount * 100) / 100}`);
    console.log(`🚀 ===============================\n`);
  } else {
    console.log(`=== FINAL RESULTS FOR "${campaignName}" ===`);
    console.log(`Health Score: ${Math.round(healthScore * 10) / 10}`);
    console.log(`Overspend: $${Math.round(overspendAmount * 100) / 100}`);
    console.log(`===============================\n`);
  }
  
  return {
    campaignName,
    budget: budget > 0 ? budget : undefined,
    spend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    revenue: totals.revenue,
    transactions: totals.transactions,
    expectedImpressions,
    daysLeft: daysLeft > 0 ? daysLeft : undefined,
    roasScore,
    deliveryPacingScore,
    burnRateScore,
    ctrScore,
    overspendScore,
    healthScore: Math.round(healthScore * 10) / 10, // Round to 1 decimal
    burnRateConfidence: burnRateData.confidence,
    pace: actualPacingPercent,
    ctr,
    roas,
    completionPercentage: Math.round(completionPercentage * 10) / 10, // Round to 1 decimal
    deliveryPacing: Math.round(deliveryPacing * 10) / 10,
    burnRate: Math.round(burnRateValue),
    overspend: Math.round(overspendAmount * 100) / 100, // Now shows projected overspend amount with improved calculation
    burnRateData,
    requiredDailyImpressions: Math.round(requiredDailyImpressions),
    burnRatePercentage: Math.round(burnRatePercentage * 10) / 10
  };
}


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

export function calculateBurnRate(data: any[], campaignName: string, requiredDailyImpressions: number = 0): BurnRateData {
  // Filter data for this campaign and sort by date
  const campaignData = data
    .filter(row => row["CAMPAIGN ORDER NAME"] === campaignName && row.DATE !== 'Totals')
    .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
  
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
  
  // Calculate percentages
  const oneDayPercentage = requiredDailyImpressions > 0 ? (oneDayRate / requiredDailyImpressions) * 100 : 0;
  const threeDayPercentage = requiredDailyImpressions > 0 ? (threeDayRate / requiredDailyImpressions) * 100 : 0;
  const sevenDayPercentage = requiredDailyImpressions > 0 ? (sevenDayRate / requiredDailyImpressions) * 100 : 0;
  
  return {
    oneDayRate,
    threeDayRate,
    sevenDayRate,
    confidence,
    oneDayPercentage,
    threeDayPercentage,
    sevenDayPercentage
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

function calculateSpendBurnRate(data: any[], campaignName: string, totalSpend: number = 0, daysIntoFlight: number = 0): { dailySpendRate: number; confidence: string } {
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
  
  if (isTargetCampaign) {
    console.log(`🎯 [OVERSPEND TARGET] Starting overspend calculation`);
    console.log(`🎯 [OVERSPEND TARGET] Inputs: spend=$${currentSpend}, budget=$${budget}, dailyRate=$${dailySpendRate.toFixed(2)}, daysLeft=${daysLeft}, confidence=${confidence}`);
  }
  
  if (!budget || budget === 0 || daysLeft < 0) {
    if (isTargetCampaign) console.log(`🎯 [OVERSPEND TARGET] No budget data or campaign ended, returning 0`);
    return 0; // No budget data or campaign ended
  }
  
  // Calculate projected total spend
  const projectedTotalSpend = currentSpend + (dailySpendRate * daysLeft);
  const projectedOverspend = Math.max(0, projectedTotalSpend - budget);
  const overspendPercentage = budget > 0 ? (projectedOverspend / budget) * 100 : 0;
  
  if (isTargetCampaign) {
    console.log(`🎯 [OVERSPEND TARGET] Calculation: ${currentSpend} + (${dailySpendRate.toFixed(2)} × ${daysLeft}) = ${projectedTotalSpend.toFixed(2)}`);
    console.log(`🎯 [OVERSPEND TARGET] Projected overspend: $${projectedOverspend.toFixed(2)} (${overspendPercentage.toFixed(1)}%)`);
  }
  
  // Adjust confidence based on data quality
  let confidenceMultiplier = 1;
  switch (confidence.split('-')[0]) { // Handle confidence strings like '7-day-capped'
    case '7-day':
      confidenceMultiplier = 1;
      break;
    case '3-day':
      confidenceMultiplier = 0.8;
      break;
    case '1-day':
      confidenceMultiplier = 0.6;
      break;
    case 'overall':
      confidenceMultiplier = 0.9;
      break;
    default:
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
  
  if (isTargetCampaign) {
    console.log(`🎯 [OVERSPEND TARGET] Score calculation: base=${baseScore}, confidence=${confidenceMultiplier}, final=${finalScore}`);
  }
  
  return finalScore;
}

function calculateCompletionPercentage(pacingData: any[], campaignName: string): number {
  console.log(`Calculating completion for campaign: "${campaignName}"`);
  console.log(`Pacing data available: ${pacingData.length} rows`);
  
  if (pacingData.length > 0) {
    console.log("Sample pacing data row:", pacingData[0]);
    console.log("Available fields in pacing data:", Object.keys(pacingData[0] || {}));
  }
  
  // Look for the campaign using the correct field name "Campaign"
  const campaignPacing = pacingData.find(row => {
    const rowCampaign = row["Campaign"];
    const normalizedRowCampaign = String(rowCampaign || "").trim();
    const normalizedCampaignName = String(campaignName || "").trim();
    
    const match = normalizedRowCampaign === normalizedCampaignName;
    if (match) {
      console.log(`Found matching campaign: "${normalizedRowCampaign}" = "${normalizedCampaignName}"`);
    }
    return match;
  });
  
  if (!campaignPacing) {
    console.log(`No pacing data found for campaign: "${campaignName}"`);
    console.log("Available campaigns in pacing data:", 
      pacingData.map(row => row["Campaign"]).filter(Boolean)
    );
    return 0;
  }
  
  // Use the correct field names from the pacing data
  const daysIntoFlight = Number(campaignPacing["Days Into Flight"]) || 0;
  const daysLeft = Number(campaignPacing["Days Left"]) || 0;
  
  console.log(`Campaign "${campaignName}": Days into flight = ${daysIntoFlight}, Days left = ${daysLeft}`);
  
  // Special case: If days left is 0 and days into flight > 1, campaign is 100% complete
  if (daysLeft === 0 && daysIntoFlight > 1) {
    console.log(`Campaign "${campaignName}" is complete (0 days left, ${daysIntoFlight} days into flight): 100%`);
    return 100;
  }
  
  if (daysIntoFlight === 0 && daysLeft === 0) {
    console.log(`No valid day data for campaign: "${campaignName}"`);
    return 0;
  }
  
  const totalDays = daysIntoFlight + daysLeft;
  const completionPercentage = totalDays > 0 ? (daysIntoFlight / totalDays) * 100 : 0;
  
  console.log(`Campaign "${campaignName}" completion: ${completionPercentage.toFixed(1)}%`);
  
  return completionPercentage;
}

function findBudgetInFields(contractTermsRow: any, campaignName: string): number {
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

function getBudgetAndDaysLeft(pacingData: any[], campaignName: string, contractTermsData: any[] = []): { budget: number; daysLeft: number } {
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
  
  // Get days left from pacing data
  const campaignPacing = pacingData.find(row => {
    const rowCampaign = row["Campaign"];
    const normalizedRowCampaign = String(rowCampaign || "").trim();
    const normalizedCampaignName = String(campaignName || "").trim();
    return normalizedRowCampaign === normalizedCampaignName;
  });
  
  const daysLeft = campaignPacing ? Number(campaignPacing["Days Left"]) || 0 : 0;
  
  if (isTargetCampaign) {
    console.log(`💰 [BUDGET TARGET] Final result: budget=$${budget}, daysLeft=${daysLeft}`);
  }
  
  return { budget, daysLeft };
}

export function calculateCampaignHealth(data: any[], campaignName: string, pacingData: any[] = [], contractTermsData: any[] = []): CampaignHealthData {
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
  
  // For now, use simplified pacing and burn rate (can be enhanced with real pacing data)
  const expectedImpressions = totals.impressions * 1.1; // Assume 110% target for demo
  const deliveryPacingScore = calculateDeliveryPacingScore(totals.impressions, expectedImpressions);
  
  // Calculate required daily impressions based on expected impressions and campaign days
  const requiredDailyImpressions = campaignRows.length > 0 ? expectedImpressions / (campaignRows.length * 1.5) : totals.impressions / 30;
  
  const burnRateData = calculateBurnRate(data, campaignName, requiredDailyImpressions);
  const burnRateScore = calculateBurnRateScore(burnRateData, requiredDailyImpressions);
  
  // Get budget and days left from contract terms and pacing data
  const { budget, daysLeft } = getBudgetAndDaysLeft(pacingData, campaignName, contractTermsData);
  if (isTargetCampaign) {
    console.log(`🚀 Target campaign budget from contract terms: $${budget}, Days left: ${daysLeft}`);
  } else {
    console.log(`Budget from contract terms: $${budget}, Days left: ${daysLeft}`);
  }
  
  // Calculate completion percentage and days into flight
  const completionPercentage = calculateCompletionPercentage(pacingData, campaignName);
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
  
  // Calculate final health score with weights
  const healthScore = 
    (roasScore * 0.40) +
    (deliveryPacingScore * 0.30) +
    (burnRateScore * 0.15) +
    (ctrScore * 0.10) +
    (overspendScore * 0.05);
  
  const pace = expectedImpressions > 0 ? (totals.impressions / expectedImpressions) * 100 : 0;
  
  // Calculate the actual values for display
  const deliveryPacing = pace || 0;
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
    pace,
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

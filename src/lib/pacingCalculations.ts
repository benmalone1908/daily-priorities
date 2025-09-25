import { differenceInDays, parseISO } from 'date-fns';
import { parseDateString } from '@/lib/utils';
import type { ContractTerms, PacingDeliveryData, CampaignMetrics, ProcessedCampaign } from '../types/pacing';

export const parseCampaignDate = (dateStr: string): Date => {
  if (!dateStr) {
    throw new Error('Date string is empty or undefined');
  }
  
  // Use the same parsing logic as the rest of the app
  const parsed = parseDateString(dateStr);
  if (!parsed) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return parsed;
};

export const calculateCampaignMetrics = (
  contractTerms: ContractTerms,
  deliveryData: PacingDeliveryData[],
  globalYesterdayDate?: Date,
  unfilteredDeliveryData?: PacingDeliveryData[]
): CampaignMetrics => {
  try {
    // Validate input data
    if (!contractTerms) {
      throw new Error('Contract terms data is missing');
    }
    
    if (!contractTerms.Budget || !contractTerms.CPM || !contractTerms['Impressions Goal']) {
      throw new Error('Missing required fields in contract terms');
    }
    
    const budget = parseFloat((contractTerms.Budget || '0').replace(/[$,]/g, ''));
    const cpm = parseFloat((contractTerms.CPM || '0').replace(/[$,]/g, ''));
    const impressionGoal = parseInt((contractTerms['Impressions Goal'] || '0').replace(/[,]/g, ''));
    
    if (isNaN(budget) || isNaN(cpm) || isNaN(impressionGoal)) {
      throw new Error(`Invalid numeric values - Budget: ${contractTerms.Budget}, CPM: ${contractTerms.CPM}, Impressions Goal: ${contractTerms['Impressions Goal']}`);
    }
    
    const startDate = parseCampaignDate(contractTerms['Start Date']);
    const endDate = parseCampaignDate(contractTerms['End Date']);
    
    // Find delivery dates for this campaign and use "yesterday" (second-most-recent) as reference
    const campaignDeliveryData = deliveryData.filter(row => row['CAMPAIGN ORDER NAME'] === contractTerms.Name);
    const deliveryDates = campaignDeliveryData
      .map(row => parseDateString(row.DATE))
      .filter(Boolean) as Date[];

    // Sort dates newest to oldest
    deliveryDates.sort((a, b) => b.getTime() - a.getTime());

    // Use "yesterday" (second-most-recent date) as reference for all calculations
    // This avoids incomplete data from the most recent date and ensures consistency
    let referenceDate: Date;
    if (deliveryDates.length >= 2) {
      // Use second-most-recent date (yesterday)
      referenceDate = deliveryDates[1];
    } else if (deliveryDates.length === 1) {
      // Only one date available, use it
      referenceDate = deliveryDates[0];
    } else {
      // Fallback to global yesterday date or today
      referenceDate = globalYesterdayDate || new Date();
    }
  
  // Calculate campaign duration (inclusive of both start and end dates)
  const totalCampaignDays = differenceInDays(endDate, startDate) + 1;
  
  // Calculate days into campaign based on reference date (yesterday)
  const daysIntoCampaign = Math.max(0, Math.min(
    differenceInDays(referenceDate, startDate) + 1, // +1 to include the reference date
    totalCampaignDays
  ));

  // Calculate days remaining from reference date to end date
  const daysUntilEnd = Math.max(0, differenceInDays(endDate, referenceDate));
  
  
  // Calculate expected impressions (total goal / total days * days elapsed)
  const averageDailyImpressions = impressionGoal / totalCampaignDays;
  const expectedImpressions = averageDailyImpressions * daysIntoCampaign;
  
  // Calculate actual impressions through reference date (yesterday) only
  const dataForCalculation = unfilteredDeliveryData || deliveryData;
  const actualImpressions = dataForCalculation
    .filter(row => {
      if (row['CAMPAIGN ORDER NAME'] !== contractTerms.Name) return false;

      // Only include data through the reference date (yesterday)
      const rowDate = parseDateString(row.DATE);
      return rowDate && rowDate.getTime() <= referenceDate.getTime();
    })
    .reduce((sum, row) => sum + parseInt(row.IMPRESSIONS.replace(/[,]/g, '') || '0'), 0);
  
  // Calculate current pacing (actual / expected)
  const currentPacing = expectedImpressions > 0 ? (actualImpressions / expectedImpressions) : 0;
  
  // Debug logging for pacing calculation
  if (currentPacing === 0 && actualImpressions > 0) {
    console.log(`\n=== PACING DEBUG: ${contractTerms.Name} ===`);
    console.log(`Reference date (yesterday): ${referenceDate.toDateString()}`);
    console.log(`Expected impressions: ${expectedImpressions}`);
    console.log(`Actual impressions: ${actualImpressions}`);
    console.log(`Days into campaign: ${daysIntoCampaign}`);
    console.log(`Total campaign days: ${totalCampaignDays}`);
    console.log(`Average daily impressions: ${averageDailyImpressions}`);
    console.log(`Current pacing: ${currentPacing}`);
  }
  
  // Calculate remaining impressions needed
  const remainingImpressions = Math.max(0, impressionGoal - actualImpressions);
  
  // Calculate remaining average needed per day
  const remainingAverageNeeded = daysUntilEnd > 0 ? remainingImpressions / daysUntilEnd : 0;
  
  // Get yesterday's impressions (from the reference date)
  const yesterdayData = dataForCalculation
    .filter(row => {
      if (row['CAMPAIGN ORDER NAME'] !== contractTerms.Name) return false;
      const rowDate = parseDateString(row.DATE);
      return rowDate && rowDate.getTime() === referenceDate.getTime();
    });

  const yesterdayImpressions = yesterdayData.length > 0
    ? parseInt(yesterdayData[0].IMPRESSIONS.replace(/[,]/g, '') || '0')
    : 0;
  
  // Calculate yesterday vs remaining needed
  const yesterdayVsNeeded = remainingAverageNeeded > 0 ? (yesterdayImpressions / remainingAverageNeeded) : 0;
  
    return {
      campaignName: contractTerms.Name,
      budget,
      cpm,
      impressionGoal,
      startDate,
      endDate,
      daysIntoCampaign,
      daysUntilEnd,
      expectedImpressions,
      actualImpressions,
      currentPacing,
      remainingImpressions,
      remainingAverageNeeded,
      yesterdayImpressions,
      yesterdayVsNeeded
    };
  } catch (error) {
    console.error('Error calculating campaign metrics:', error);
    throw error;
  }
};

export const processCampaigns = (
  contractTermsData: ContractTerms[],
  deliveryData: PacingDeliveryData[],
  unfilteredDeliveryData?: PacingDeliveryData[]
): ProcessedCampaign[] => {
  const processedCampaigns: ProcessedCampaign[] = [];
  const skippedCampaigns: string[] = [];

  // Calculate global "yesterday" date (second-most-recent) from unfiltered delivery data
  const dataForGlobalDate = unfilteredDeliveryData || deliveryData;
  const allDeliveryDates = dataForGlobalDate
    .map(row => parseDateString(row.DATE))
    .filter(Boolean) as Date[];

  // Sort dates newest to oldest and use second-most-recent as global reference
  allDeliveryDates.sort((a, b) => b.getTime() - a.getTime());

  const globalYesterdayDate = allDeliveryDates.length >= 2
    ? allDeliveryDates[1] // Second-most-recent (yesterday)
    : allDeliveryDates.length === 1
    ? allDeliveryDates[0] // Only one date available
    : new Date(); // Fallback to today

  console.log(`Global reference date (yesterday) from all delivery data: ${globalYesterdayDate.toDateString()}`);

  contractTermsData.forEach(contractTerms => {
    try {
      const campaignDeliveryData = deliveryData.filter(
        row => row['CAMPAIGN ORDER NAME'] === contractTerms.Name
      );

      // Skip campaigns that have no delivery data
      if (campaignDeliveryData.length === 0) {
        console.log(`Skipping campaign "${contractTerms.Name}" - no delivery data found`);
        skippedCampaigns.push(contractTerms.Name);
        return;
      }

      const metrics = calculateCampaignMetrics(contractTerms, deliveryData, globalYesterdayDate, unfilteredDeliveryData);

      processedCampaigns.push({
        name: contractTerms.Name,
        contractTerms,
        deliveryData: campaignDeliveryData,
        metrics
      });
    } catch (error) {
      console.warn(`Skipping campaign "${contractTerms.Name}" due to error:`, error);
      skippedCampaigns.push(contractTerms.Name);
    }
  });

  if (skippedCampaigns.length > 0) {
    console.log(`Successfully processed ${processedCampaigns.length} campaigns. Skipped ${skippedCampaigns.length} campaigns with errors: ${skippedCampaigns.join(', ')}`);
  }

  return processedCampaigns;
};
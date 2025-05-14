
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type CampaignFilterContextType = {
  showLiveOnly: boolean;
  setShowLiveOnly: (value: boolean) => void;
  showAggregatedSparkCharts: boolean;
  setShowAggregatedSparkCharts: (value: boolean) => void;
  showDebugInfo: boolean;
  setShowDebugInfo: (value: boolean) => void;
  extractAdvertiserName: (campaignName: string) => string;
  isTestCampaign: (campaignName: string) => boolean;
};

const CampaignFilterContext = createContext<CampaignFilterContextType | undefined>(undefined);

export function CampaignFilterProvider({ children }: { children: ReactNode }) {
  const [showLiveOnly, setShowLiveOnly] = useState(true); // Default to showing live campaigns
  const [showAggregatedSparkCharts, setShowAggregatedSparkCharts] = useState(true); // Default to showing aggregated spark charts
  const [showDebugInfo, setShowDebugInfo] = useState(false); // Default to hiding debug info

  // Helper function to check if a campaign is a test/demo/draft campaign
  const isTestCampaign = (campaignName: string): boolean => {
    if (!campaignName) return false;
    
    const lowerCaseName = campaignName.toLowerCase();
    return lowerCaseName.includes('test') || 
           lowerCaseName.includes('demo') || 
           lowerCaseName.includes('draft');
  };

  // Helper function to extract advertiser name from campaign name
  const extractAdvertiserName = (campaignName: string): string => {
    if (!campaignName) return "";
    
    console.log(`Trying to extract advertiser from: "${campaignName}"`);
    
    // Special case for Sol Flower
    if (campaignName.includes('Sol Flower')) {
      console.log(`Found Sol Flower campaign: "${campaignName}"`);
      return "Sol Flower";
    }
    
    // Try with the expanded agency prefixes regex
    const agencyPrefixes = "SM|2RS|6D|BLO|FLD|HD|HG|HRB|MJ|NLMC|NP|PRP|TF|TRN|W&T|WWX";
    const regex = new RegExp(`(${agencyPrefixes}):\\s+(.*?)(?=-)`, 'i');
    
    const match = campaignName.match(regex);
    if (match && match[2]) {
      const extracted = match[2].trim();
      console.log(`Regex extraction result: "${extracted}" from "${campaignName}"`);
      return extracted;
    }
    
    // Fallback to splitting by hyphen if the regex fails
    const prefixMatch = campaignName.match(new RegExp(`^(${agencyPrefixes}):`));
    if (prefixMatch && campaignName.includes('-')) {
      const parts = campaignName.split('-');
      // First part should contain "PREFIX: Advertiser"
      const firstPart = parts[0].trim();
      
      const colonIndex = firstPart.indexOf(':');
      if (colonIndex !== -1) {
        // Extract everything after ":"
        const extracted = firstPart.substring(colonIndex + 1).trim();
        console.log(`Fallback extraction result: "${extracted}" from "${campaignName}"`);
        return extracted;
      }
    }
    
    console.log(`Failed to extract advertiser from: "${campaignName}"`);
    return "";
  };

  // Log some test cases for debugging
  useEffect(() => {
    console.log("Testing advertiser extraction with special cases and multiple agency prefixes:");
    const testCases = [
      "SM: Sol Flower-Tucson Foothills-241030",
      "SM: Sol Flower-Tempe University-241030",
      "SM: ABC Company-Campaign Name-123456",
      "SM: XYZ Inc - With Space - 987654",
      "2RS: Agency Name-Campaign Details-123",
      "6D: Digital Marketing-Summer Promo-456",
      "BLO: Big Agency-Fall Campaign-789",
      "FLD: Field Agency-Retail Push-101",
      "HD: Heavy Digital-Brand Awareness-112",
      "HG: Higher Ground-New Product-131",
      "HRB: Herbal Co-Seasonal-415",
      "MJ: Major Media-Product Launch-617",
      "NLMC: Northern Lights-Holiday Special-718",
      "NP: North Point-Black Friday-819",
      "PRP: Purple Rain-Winter Sale-920",
      "TF: Top Flight-Spring Collection-1021",
      "TRN: Turn Key-Summer Festival-1122",
      "W&T: White & Teal-Fashion Week-1223",
      "WWX: Worldwide Express-Global Campaign-1324",
      "SM: Something Else",
      "This doesn't match any pattern"
    ];
    
    testCases.forEach(test => {
      const result = extractAdvertiserName(test);
      const isTest = isTestCampaign(test);
      console.log(`Test: "${test}" -> "${result}", Is Test Campaign: ${isTest}`);
    });
    
    // Test some test/demo/draft cases
    const testCampaignCases = [
      "SM: Agency-Test Campaign-123",
      "2RS: Company-DEMO Campaign-456",
      "MJ: Client-dRaFt Version-789",
      "Regular Campaign Name",
    ];
    
    console.log("\nTesting test/demo/draft detection:");
    testCampaignCases.forEach(test => {
      const isTest = isTestCampaign(test);
      console.log(`"${test}" is test campaign: ${isTest}`);
    });
  }, []);

  return (
    <CampaignFilterContext.Provider value={{ 
      showLiveOnly, 
      setShowLiveOnly,
      showAggregatedSparkCharts,
      setShowAggregatedSparkCharts,
      showDebugInfo,
      setShowDebugInfo,
      extractAdvertiserName,
      isTestCampaign
    }}>
      {children}
    </CampaignFilterContext.Provider>
  );
}

export function useCampaignFilter() {
  const context = useContext(CampaignFilterContext);
  if (context === undefined) {
    throw new Error('useCampaignFilter must be used within a CampaignFilterProvider');
  }
  return context;
}


import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define agency mapping
export const agencyMapping: Record<string, string> = {
  "6D": "6 Degrees Media",
  "BLO": "Be Local One",
  "FLD": "Fieldtest",
  "HD": "Highday",
  "HG": "Happy Greens",
  "HRB": "Herb.co",
  "MJ": "MediaJel",
  "NLMC": "NLMC",
  "NP": "Noble People",
  "PRP": "Propaganda Creative",
  "SM": "SM Services",
  "TF": "Tact Firm",
  "TRN": "Terrayn",
  "Two Rivers": "Two Rivers", // Changed from "2RS" to "Two Rivers"
  "2RS": "Two Rivers", // Keep this entry for backward compatibility
  "W&T": "Water & Trees",
  "WWX": "Wunderworx"
};

type CampaignFilterContextType = {
  showLiveOnly: boolean;
  setShowLiveOnly: (value: boolean) => void;
  showAggregatedSparkCharts: boolean;
  setShowAggregatedSparkCharts: (value: boolean) => void;
  showDebugInfo: boolean;
  setShowDebugInfo: (value: boolean) => void;
  extractAdvertiserName: (campaignName: string) => string;
  extractAgencyName: (campaignName: string) => string;
  getAgencyFromPrefix: (prefix: string) => string;
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
  
  // Get the full agency name from the prefix
  const getAgencyFromPrefix = (prefix: string): string => {
    if (!prefix) return "";
    
    // Return the mapped agency name if it exists
    return agencyMapping[prefix] || prefix;
  };
  
  // Helper function to extract agency prefix from campaign name
  const extractAgencyName = (campaignName: string): string => {
    if (!campaignName) return "";
    
    // Debug the incoming campaign name
    console.log(`Extracting agency from campaign: "${campaignName}"`);
    
    // Check for the common pattern: PREFIX: Advertiser-Details
    const colonIndex = campaignName.indexOf(':');
    if (colonIndex > 0) {
      const prefix = campaignName.substring(0, colonIndex).trim();
      console.log(`Found prefix: "${prefix}" in "${campaignName}"`);
      
      // Get the agency name from the mapping
      const agencyName = getAgencyFromPrefix(prefix);
      console.log(`Mapped agency: "${agencyName}" from prefix "${prefix}"`);
      return agencyName;
    }
    
    console.log(`No agency prefix found in campaign: "${campaignName}"`);
    return "";
  };

  // Helper function to extract advertiser name from campaign name
  const extractAdvertiserName = (campaignName: string): string => {
    if (!campaignName) return "";
    
    // Special case for Sol Flower
    if (campaignName.includes('Sol Flower')) {
      return "Sol Flower";
    }
    
    // Extract advertiser from campaign name format: PREFIX: Advertiser-Campaign-Date
    const colonIndex = campaignName.indexOf(':');
    if (colonIndex > 0) {
      // Get everything after the colon and before the first hyphen
      const afterColon = campaignName.substring(colonIndex + 1).trim();
      const hyphenIndex = afterColon.indexOf('-');
      
      if (hyphenIndex > 0) {
        return afterColon.substring(0, hyphenIndex).trim();
      } else {
        return afterColon.trim(); // No hyphen found, return everything after colon
      }
    }
    
    return ""; // No advertiser found
  };

  // Log some test cases for debugging
  useEffect(() => {
    console.log("Testing agency extraction with sample campaign names:");
    const testCases = [
      "SM: Sol Flower-Tucson Foothills-241030",
      "MJ: Test Brand-Campaign-123456",
      "2RS: Agency Name-Campaign Details-123",
      "6D: Digital Marketing-Summer Promo-456",
      "TF: Bloom-Display-241003",
      "W&T: Client-Campaign-DATE",
      "HRB: Blue Sage-Campaign-123"
    ];
    
    testCases.forEach(test => {
      const agency = extractAgencyName(test);
      const advertiser = extractAdvertiserName(test);
      console.log(`Test: "${test}" -> Agency: "${agency}", Advertiser: "${advertiser}"`);
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
      extractAgencyName,
      getAgencyFromPrefix,
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

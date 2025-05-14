
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
    
    // Handle special case for "2RS" which is now "Two Rivers"
    if (prefix === "2RS") {
      return "Two Rivers";
    }
    
    return agencyMapping[prefix] || prefix;
  };
  
  // Helper function to extract agency prefix from campaign name
  const extractAgencyName = (campaignName: string): string => {
    if (!campaignName) return "";
    
    // Special case for Two Rivers (formerly 2RS)
    if (campaignName.startsWith("2RS:")) {
      return "Two Rivers";
    }
    
    // Fix: Use exact prefix matching with a more reliable approach
    for (const prefix of Object.keys(agencyMapping)) {
      if (campaignName.startsWith(`${prefix}:`)) {
        return getAgencyFromPrefix(prefix);
      }
    }
    
    // Additional check for 2RS without using regex
    if (campaignName.startsWith("2RS:")) {
      return "Two Rivers";
    }
    
    console.log(`No agency found for campaign: "${campaignName}"`);
    return "";
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
    const agencyPrefixes = Object.keys(agencyMapping).join('|');
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
    console.log("Testing agency extraction with sample campaign names:");
    const testCases = [
      "SM: Sol Flower-Tucson Foothills-241030",
      "MJ: Test Brand-Campaign-123456",
      "2RS: Agency Name-Campaign Details-123",
      "6D: Digital Marketing-Summer Promo-456",
    ];
    
    testCases.forEach(test => {
      const agency = extractAgencyName(test);
      console.log(`Test: "${test}" -> Agency: "${agency}"`);
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

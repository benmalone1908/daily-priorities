
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type CampaignFilterContextType = {
  showLiveOnly: boolean;
  setShowLiveOnly: (value: boolean) => void;
  showAggregatedSparkCharts: boolean;
  setShowAggregatedSparkCharts: (value: boolean) => void;
  showDebugInfo: boolean;
  setShowDebugInfo: (value: boolean) => void;
  extractAdvertiserName: (campaignName: string) => string;
};

const CampaignFilterContext = createContext<CampaignFilterContextType | undefined>(undefined);

export function CampaignFilterProvider({ children }: { children: ReactNode }) {
  const [showLiveOnly, setShowLiveOnly] = useState(true); // Default to showing live campaigns
  const [showAggregatedSparkCharts, setShowAggregatedSparkCharts] = useState(true); // Default to showing aggregated spark charts
  const [showDebugInfo, setShowDebugInfo] = useState(false); // Default to hiding debug info

  // Helper function to extract advertiser name from campaign name
  const extractAdvertiserName = (campaignName: string): string => {
    if (!campaignName) return "";
    
    console.log(`Trying to extract advertiser from: "${campaignName}"`);
    
    // Special case for Sol Flower
    if (campaignName.includes('Sol Flower')) {
      console.log(`Found Sol Flower campaign: "${campaignName}"`);
      return "Sol Flower";
    }
    
    // Try the lookahead regex approach
    const regex = /SM:\s+(.*?)(?=-)/;
    const match = campaignName.match(regex);
    if (match && match[1]) {
      const extracted = match[1].trim();
      console.log(`Regex extraction result: "${extracted}" from "${campaignName}"`);
      return extracted;
    }
    
    // Fallback to splitting by hyphen if the regex fails
    if (campaignName.includes('SM:') && campaignName.includes('-')) {
      const parts = campaignName.split('-');
      // First part should contain "SM: Advertiser"
      const firstPart = parts[0].trim();
      
      if (firstPart.startsWith('SM:')) {
        // Extract everything after "SM:"
        const extracted = firstPart.substring(3).trim();
        console.log(`Fallback extraction result: "${extracted}" from "${campaignName}"`);
        return extracted;
      }
    }
    
    console.log(`Failed to extract advertiser from: "${campaignName}"`);
    return "";
  };

  // Log some test cases for debugging
  useEffect(() => {
    console.log("Testing advertiser extraction with special cases:");
    const testCases = [
      "SM: Sol Flower-Tucson Foothills-241030",
      "SM: Sol Flower-Tempe University-241030",
      "SM: ABC Company-Campaign Name-123456",
      "SM: XYZ Inc - With Space - 987654",
      "SM: Something Else"
    ];
    
    testCases.forEach(test => {
      const result = extractAdvertiserName(test);
      console.log(`Test: "${test}" -> "${result}"`);
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
      extractAdvertiserName
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

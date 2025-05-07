
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
    
    // Try the regex approach first
    const match = campaignName.match(/SM:\s+(.*?)(?=-)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback to splitting by hyphen if the regex fails
    if (campaignName.includes('SM:') && campaignName.includes('-')) {
      const parts = campaignName.split('-');
      // First part should contain "SM: Advertiser"
      const firstPart = parts[0].trim();
      
      if (firstPart.startsWith('SM:')) {
        // Extract everything after "SM:"
        return firstPart.substring(3).trim();
      }
    }
    
    return "";
  };

  // Log out any Sol Flower campaigns for debugging
  useEffect(() => {
    console.log("CampaignFilterContext ready for advertiser extraction");
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

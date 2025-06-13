import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define the agency mapping
export const AGENCY_MAPPING: Record<string, string> = {
  '2RS': 'Two Rivers',
  '6D': '6 Degrees Media',
  'BLO': 'Be Local One',
  'FLD': 'Fieldtest',
  'HD': 'Highday',
  'HG': 'Happy Greens',
  'HRB': 'Herb.co',
  'LP': 'Lettuce Print',
  'MJ': 'MediaJel',
  'NLMC': 'NLMC',
  'NP': 'Noble People',
  'PRP': 'Propaganda Creative',
  'SM': 'SM Services',
  'TF': 'Tact Firm',
  'TRN': 'Terrayn',
  'W&T': 'Water & Trees',
  'WWX': 'Wunderworx'
};

type CampaignFilterContextType = {
  showLiveOnly: boolean;
  setShowLiveOnly: (value: boolean) => void;
  showAggregatedSparkCharts: boolean;
  setShowAggregatedSparkCharts: (value: boolean) => void;
  showDebugInfo: boolean;
  setShowDebugInfo: (value: boolean) => void;
  extractAdvertiserName: (campaignName: string) => string;
  extractAgencyInfo: (campaignName: string) => { agency: string, abbreviation: string };
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

  // Helper function to extract agency information from campaign name
  const extractAgencyInfo = (campaignName: string): { agency: string, abbreviation: string } => {
    if (!campaignName) return { agency: "", abbreviation: "" };
    
    console.log(`Extracting agency from: "${campaignName}"`);
    
    // Special case for the campaigns with Partner-PRP or PRP-Pend Oreille
    if (campaignName.includes('2001943:Partner-PRP') || campaignName.includes('2001943: PRP-Pend Oreille')) {
      return { agency: 'Propaganda Creative', abbreviation: 'PRP' };
    }
    
    // Handle campaign names with "Awaiting IO"
    if (campaignName.startsWith('Awaiting IO:')) {
      // Extract the agency abbreviation after "Awaiting IO:"
      const awaitingIOMatch = campaignName.match(/^Awaiting IO:\s*([^:]+):/);
      if (awaitingIOMatch && awaitingIOMatch[1]) {
        const abbreviation = awaitingIOMatch[1].trim();
        const agency = AGENCY_MAPPING[abbreviation] || abbreviation;
        console.log(`Awaiting IO format: "${campaignName}" -> Agency: "${agency}", Abbreviation: "${abbreviation}"`);
        return { agency, abbreviation };
      }
    }
    
    // Special case for campaigns starting with numeric IDs and containing WWX-
    // (e.g., "2001863: WWX-Client Name" or "2001864-WWX-Client Name")
    if (campaignName.match(/^\d+:?\s*WWX-/) || campaignName.includes('-WWX-')) {
      console.log(`WWX format: "${campaignName}" -> Agency: "Wunderworx", Abbreviation: "WWX"`);
      return { agency: 'Wunderworx', abbreviation: 'WWX' };
    }
    
    // Handle campaign names with slashes in the IO number - UPDATED REGEX TO HANDLE SPACES
    // Format like "2001567/2001103: MJ: Mankind Dispensary-Concerts/Gamers-250404"
    // OR "2001569 / 2001963: MJ: Test Client-Campaign Name-250501" (with spaces around slash)
    // The key fix: look for the pattern after the colon, not before it, and handle optional spaces around slash
    const slashFormatMatch = campaignName.match(/^\d+\s*\/\s*\d+:\s*([^:]+):/);
    if (slashFormatMatch && slashFormatMatch[1]) {
      const abbreviation = slashFormatMatch[1].trim();
      const agency = AGENCY_MAPPING[abbreviation] || abbreviation;
      console.log(`Slash format: "${campaignName}" -> Agency: "${agency}", Abbreviation: "${abbreviation}"`);
      return { agency, abbreviation };
    }
    
    // New regex pattern to better match the format "2001367: HRB: District Cannabis-241217"
    // This will extract just the agency abbreviation between first and second colon
    const agencyMatch = campaignName.match(/^\d+:\s*([^:]+):/);
    
    if (agencyMatch && agencyMatch[1]) {
      const abbreviation = agencyMatch[1].trim();
      
      // Look up the full agency name from the mapping
      const agency = AGENCY_MAPPING[abbreviation] || abbreviation;
      
      console.log(`Standard format: "${campaignName}" -> Agency: "${agency}", Abbreviation: "${abbreviation}"`);
      return { agency, abbreviation };
    }
    
    // Fallback to original regex for backward compatibility
    const originalAgencyMatch = campaignName.match(/^([^:]+):/);
    if (originalAgencyMatch && originalAgencyMatch[1]) {
      const abbreviation = originalAgencyMatch[1].trim();
      const agency = AGENCY_MAPPING[abbreviation] || abbreviation;
      console.log(`Fallback format: "${campaignName}" -> Agency: "${agency}", Abbreviation: "${abbreviation}"`);
      return { agency, abbreviation };
    }
    
    console.log(`No match found for: "${campaignName}"`);
    return { agency: "", abbreviation: "" };
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
    
    // Handle "Awaiting IO" format
    if (campaignName.startsWith('Awaiting IO:')) {
      const awaitingIOMatch = campaignName.match(/^Awaiting IO:\s*[^:]+:\s*([^-]+)/);
      if (awaitingIOMatch && awaitingIOMatch[1]) {
        const extracted = awaitingIOMatch[1].trim();
        console.log(`Awaiting IO format extraction result: "${extracted}" from "${campaignName}"`);
        return extracted;
      }
    }
    
    // For the new format "2001367: HRB: District Cannabis-241217"
    // This will extract the advertiser name between second colon and dash
    const newFormatMatch = campaignName.match(/^\d+(?:\/\d+)?:\s*[^:]+:\s*([^-]+)/);
    if (newFormatMatch && newFormatMatch[1]) {
      const extracted = newFormatMatch[1].trim();
      console.log(`New format extraction result: "${extracted}" from "${campaignName}"`);
      return extracted;
    }
    
    // Try with the expanded agency prefixes regex
    const agencyPrefixes = "SM|2RS|6D|BLO|FLD|HD|HG|HRB|LP|MJ|NLMC|NP|PRP|TF|TRN|W&T|WWX";
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
    console.log("Testing agency extraction with problematic cases:");
    const problemCases = [
      "2001569/2001963: MJ: Test Client-Campaign Name-250501",
      "2001567/2001103: MJ: Mankind Dispensary-Concerts/Gamers-250404",
      "2001216/2001505: NLMC: Strawberry Fields-Pueblo North-250411",
    ];
    
    problemCases.forEach(test => {
      const agencyInfo = extractAgencyInfo(test);
      console.log(`Problem case: "${test}" -> Agency: "${agencyInfo.agency}", Abbreviation: "${agencyInfo.abbreviation}"`);
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
      extractAgencyInfo,
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

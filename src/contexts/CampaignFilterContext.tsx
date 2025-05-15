
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
        return { agency, abbreviation };
      }
    }
    
    // Special case for campaigns starting with numeric IDs and containing WWX-
    // (e.g., "2001863: WWX-Client Name" or "2001864-WWX-Client Name")
    if (campaignName.match(/^\d+:?\s*WWX-/) || campaignName.includes('-WWX-')) {
      return { agency: 'Wunderworx', abbreviation: 'WWX' };
    }
    
    // Handle campaign names with slashes in the IO number
    // Format like "2001567/2001103: MJ: Mankind Dispensary-Concerts/Gamers-250404"
    const slashFormatMatch = campaignName.match(/^\d+\/\d+:\s*([^:]+):/);
    if (slashFormatMatch && slashFormatMatch[1]) {
      const abbreviation = slashFormatMatch[1].trim();
      const agency = AGENCY_MAPPING[abbreviation] || abbreviation;
      return { agency, abbreviation };
    }
    
    // New regex pattern to better match the format "2001367: HRB: District Cannabis-241217"
    // This will extract just the agency abbreviation between first and second colon
    const agencyMatch = campaignName.match(/^\d+:\s*([^:]+):/);
    
    if (agencyMatch && agencyMatch[1]) {
      const abbreviation = agencyMatch[1].trim();
      
      // Look up the full agency name from the mapping
      const agency = AGENCY_MAPPING[abbreviation] || abbreviation;
      
      return { agency, abbreviation };
    }
    
    // Fallback to original regex for backward compatibility
    const originalAgencyMatch = campaignName.match(/^([^:]+):/);
    if (originalAgencyMatch && originalAgencyMatch[1]) {
      const abbreviation = originalAgencyMatch[1].trim();
      const agency = AGENCY_MAPPING[abbreviation] || abbreviation;
      return { agency, abbreviation };
    }
    
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
      "2001367: HRB: District Cannabis-241217",
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
      const agencyInfo = extractAgencyInfo(test);
      const isTest = isTestCampaign(test);
      console.log(`Test: "${test}" -> Advertiser: "${result}", Agency: "${agencyInfo.agency}", Abbreviation: "${agencyInfo.abbreviation}", Is Test Campaign: ${isTest}`);
    });
    
    // Test our specific problem cases
    console.log("\nTesting special problem cases:");
    const problemCases = [
      "2001216/2001505: NLMC: Strawberry Fields-Pueblo North-250411",
      "2001567/2001103: MJ: Mankind Dispensary-Concerts/Gamers-250404",
      "2001943:Partner-PRP-Pend Oreille Spokane DIS-250416",
      "2001943: PRP-Pend Oreille CTV-250415",
      "Awaiting IO: MJ: Test Client-Campaign Name-250501",
      "2001863: WWX-Some Client-250514", // New WWX case with colon
      "2001864-WWX-Another Client-250514"  // New WWX case with hyphen
    ];
    
    problemCases.forEach(test => {
      const agencyInfo = extractAgencyInfo(test);
      console.log(`Problem case: "${test}" -> Agency: "${agencyInfo.agency}", Abbreviation: "${agencyInfo.abbreviation}"`);
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

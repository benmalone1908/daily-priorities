
import React, { createContext, useContext, useState, ReactNode } from 'react';

type CampaignFilterContextType = {
  showLiveOnly: boolean;
  setShowLiveOnly: (value: boolean) => void;
};

const CampaignFilterContext = createContext<CampaignFilterContextType | undefined>(undefined);

export function CampaignFilterProvider({ children }: { children: ReactNode }) {
  const [showLiveOnly, setShowLiveOnly] = useState(true); // Default to showing live campaigns

  return (
    <CampaignFilterContext.Provider value={{ showLiveOnly, setShowLiveOnly }}>
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

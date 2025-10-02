import { useContext } from 'react';
import { CampaignFilterContext } from './CampaignFilterContext';

export function useCampaignFilter() {
  const context = useContext(CampaignFilterContext);
  if (context === undefined) {
    throw new Error('useCampaignFilter must be used within a CampaignFilterProvider');
  }
  return context;
}

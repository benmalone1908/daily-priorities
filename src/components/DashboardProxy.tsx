
import Dashboard from './Dashboard';

// This component serves as a compatibility layer between DashboardWrapper and Dashboard
// to handle differences in prop interfaces
const DashboardProxy = (props: any) => {
  // Extract weekly campaign props
  const { selectedWeeklyCampaigns, onWeeklyCampaignsChange, ...dashboardProps } = props;
  
  // Pass the weekly campaign props explicitly to Dashboard
  return <Dashboard 
    {...dashboardProps}
    selectedWeeklyCampaigns={selectedWeeklyCampaigns}
    onWeeklyCampaignsChange={onWeeklyCampaignsChange}
  />;
};

export default DashboardProxy;


import Dashboard from './Dashboard';

// This component serves as a compatibility layer between DashboardWrapper and Dashboard
// to handle differences in prop interfaces
const DashboardProxy = (props: any) => {
  // Extract weekly campaign props
  const { selectedWeeklyCampaigns, onWeeklyCampaignsChange, ...dashboardProps } = props;
  
  // Store these props in a ref or context if Dashboard needs to access them
  // For now, we'll only pass through the props that Dashboard expects
  
  return <Dashboard {...dashboardProps} />;
};

export default DashboardProxy;

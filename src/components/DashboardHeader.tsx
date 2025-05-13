
import { DateRange } from "react-day-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ChartLine } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import { CampaignStatusToggle } from "@/components/CampaignStatusToggle";

interface DashboardHeaderProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showLiveOnly: boolean;
  filteredDataCount: number;
}

const DashboardHeader = ({
  dateRange,
  onDateRangeChange,
  activeTab,
  onTabChange,
  showLiveOnly,
  filteredDataCount
}: DashboardHeaderProps) => {
  const getDateRangeDisplayText = () => {
    if (!dateRange || !dateRange.from) return null;
    
    const fromDate = dateRange.from;
    const toDate = dateRange.to || fromDate;
    
    const fromStr = `${fromDate.getMonth() + 1}/${fromDate.getDate()}/${fromDate.getFullYear()}`;
    const toStr = `${toDate.getMonth() + 1}/${toDate.getDate()}/${toDate.getFullYear()}`;
    
    return `Showing data for: ${fromStr} to ${toStr} (${filteredDataCount} records)`;
  };

  return (
    <div className="border-b animate-fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img 
            src="/lovable-uploads/8d86c84a-0c96-4897-8d80-48ae466c4000.png" 
            alt="Display Campaign Monitor" 
            className="h-14 w-auto"
          />
          <h1 className="text-2xl font-bold">Display Campaign Monitor</h1>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-6">
          <CampaignStatusToggle />
          <Tabs className="w-full md:w-auto" value={activeTab} onValueChange={onTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dashboard">
                <LayoutDashboard className="mr-2" size={16} />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="sparks">
                <ChartLine className="mr-2" size={16} />
                Trends
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <DateRangePicker 
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            displayDateRangeSummary={!!dateRange?.from}
            dateRangeSummaryText={getDateRangeDisplayText()}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;

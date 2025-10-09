import React from 'react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';

interface SidebarLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pacingDataLength: number;
  contractTermsDataLength: number;
  dataLength: number;
  hasAllData?: boolean;
  onClearDatabase?: () => void;
  onUploadCSV?: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  lastCampaignUpload?: Date | null;
  lastContractUpload?: Date | null;
  screenshotMode?: boolean;
}

const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  activeTab,
  onTabChange,
  pacingDataLength,
  contractTermsDataLength,
  dataLength,
  hasAllData,
  onClearDatabase,
  onUploadCSV,
  children,
  header,
  className,
  lastCampaignUpload,
  lastContractUpload,
  screenshotMode = false
}) => {
  return (
    <div className={cn(
      "flex bg-gray-50",
      screenshotMode ? "min-h-screen" : "h-screen",
      className
    )}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        pacingDataLength={pacingDataLength}
        contractTermsDataLength={contractTermsDataLength}
        dataLength={dataLength}
        hasAllData={hasAllData}
        onClearDatabase={onClearDatabase}
        onUploadCSV={onUploadCSV}
        lastCampaignUpload={lastCampaignUpload}
        lastContractUpload={lastContractUpload}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Section */}
        {header && (
          <div className="bg-white border-b border-gray-200 px-4 lg:px-6">
            {header}
          </div>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1",
          screenshotMode ? "" : "overflow-auto"
        )}>
          <div className={cn(
            "pt-12 lg:pt-0",
            screenshotMode ? "" : "h-full"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
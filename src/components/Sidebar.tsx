import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AdminPasswordDialog } from '@/components/AdminPasswordDialog';
import { useAuth } from '@/contexts/use-auth';
import {
  LayoutDashboard,
  ChartLine,
  Activity,
  Target,
  Clock,
  Bell,
  FileDown,
  FileText,
  Menu,
  X,
  Trash2,
  Upload,
  Users,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pacingDataLength: number;
  contractTermsDataLength: number;
  dataLength: number;
  hasAllData?: boolean;
  onClearDatabase?: () => void;
  onUploadCSV?: () => void;
  className?: string;
  lastCampaignUpload?: Date | null;
  lastContractUpload?: Date | null;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  condition?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pacingDataLength,
  contractTermsDataLength,
  dataLength,
  hasAllData,
  onClearDatabase,
  onUploadCSV,
  className,
  lastCampaignUpload,
  lastContractUpload
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const { logout } = useAuth();

  // Format timestamp in Pacific Time
  const formatTimestamp = (date: Date | null | undefined): string => {
    if (!date) return 'Never';

    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      condition: true
    },
    {
      id: 'sparks',
      label: 'Trends',
      icon: ChartLine,
      condition: true
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: Users,
      condition: dataLength > 0
    },
    {
      id: 'health',
      label: 'Health',
      icon: Activity,
      condition: pacingDataLength > 0 || contractTermsDataLength > 0
    },
    {
      id: 'pacing',
      label: 'Pacing',
      icon: Target,
      condition: true
    },
    {
      id: 'status',
      label: 'Status',
      icon: Clock,
      condition: contractTermsDataLength > 0 || dataLength > 0
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      condition: dataLength > 0
    },
    {
      id: 'custom-report',
      label: 'Custom Report',
      icon: FileDown,
      condition: true
    },
    {
      id: 'raw-data',
      label: 'Raw Data',
      icon: FileText,
      condition: true
    }
  ];

  const visibleNavItems = navItems.filter(item => item.condition);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex h-8 w-8 p-0"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto flex flex-col">
        <div className="space-y-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-10 px-3 transition-colors",
                  isCollapsed && "justify-center px-2",
                  isActive && "bg-primary text-primary-foreground shadow-sm",
                  !isActive && "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                )}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileOpen(false);
                }}
              >
                <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
          {/* Upload CSV Button */}
          {onUploadCSV && (
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start h-10 px-3 text-blue-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 transition-colors",
                isCollapsed && "justify-center px-2"
              )}
              onClick={() => {
                onUploadCSV();
                setIsMobileOpen(false);
              }}
            >
              <Upload className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <span className="text-sm font-medium">Upload CSV</span>
              )}
            </Button>
          )}

          {/* Last Upload Timestamps */}
          {!isCollapsed && (lastCampaignUpload || lastContractUpload) && (
            <div className="space-y-2 pt-2 px-2">
              <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                Data Last Updated
              </div>
              {lastCampaignUpload && (
                <div>
                  <div className="text-[11px] font-medium text-gray-700">Campaign Data</div>
                  <div className="text-[11px] text-gray-500">{formatTimestamp(lastCampaignUpload)} PT</div>
                </div>
              )}
              {lastContractUpload && (
                <div>
                  <div className="text-[11px] font-medium text-gray-700">Contract Terms</div>
                  <div className="text-[11px] text-gray-500">{formatTimestamp(lastContractUpload)} PT</div>
                </div>
              )}
            </div>
          )}

          {/* Clear Database Button */}
          {onClearDatabase && pacingDataLength === 0 && (
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start h-10 px-3 text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-colors",
                isCollapsed && "justify-center px-2"
              )}
              onClick={() => {
                setShowAdminDialog(true);
                setIsMobileOpen(false);
              }}
            >
              <Trash2 className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <span className="text-sm font-medium">Clear Database</span>
              )}
            </Button>
          )}

          {/* Record Count Display */}
          {dataLength > 0 && !isCollapsed && (
            <div className="text-center pt-2">
              <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                {hasAllData ? `${dataLength.toLocaleString()} records (complete)` : `${dataLength.toLocaleString()} records (recent)`}
              </span>
            </div>
          )}

          {/* Logout Button */}
          <div className="pt-12">
            <Button
            variant="outline"
            className={cn(
              "w-full justify-start h-10 px-3 text-gray-600 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors border-gray-200",
              isCollapsed && "justify-center px-2"
            )}
            onClick={() => {
              logout();
              setIsMobileOpen(false);
            }}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </Button>
          </div>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 h-8 w-8 p-0 bg-white/90 backdrop-blur-sm border shadow-sm"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
          isCollapsed ? "w-16" : "w-[200px]",
          className
        )}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-50",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </div>

      {/* Admin Password Dialog */}
      <AdminPasswordDialog
        isOpen={showAdminDialog}
        onClose={() => setShowAdminDialog(false)}
        onSuccess={() => {
          onClearDatabase?.();
        }}
        title="Admin Authentication Required"
        description="Clearing the database will permanently delete all campaign data. This action cannot be undone. Please enter the admin password to continue."
      />
    </>
  );
};

export default Sidebar;
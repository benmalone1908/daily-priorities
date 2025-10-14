/**
 * RenewalStatusBadge - Badge component for displaying and updating campaign renewal status
 */

import { useState } from 'react';
import { RenewalStatus, RENEWAL_STATUS_LABELS, RENEWAL_STATUS_COLORS } from '@/types/daily-priorities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RenewalStatusBadgeProps {
  campaignName: string;
  currentStatus?: RenewalStatus;
  onStatusChange: (campaignName: string, newStatus: RenewalStatus) => void;
}

const statusOptions: RenewalStatus[] = [
  'Awaiting Confirmation',
  'Confirmed - Pending Submission',
  'Renewal Submitted',
  'Not Renewing'
];

export default function RenewalStatusBadge({
  campaignName,
  currentStatus = 'Awaiting Confirmation',
  onStatusChange
}: RenewalStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusSelect = (newStatus: RenewalStatus) => {
    onStatusChange(campaignName, newStatus);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-7 gap-1 text-xs font-medium border',
            RENEWAL_STATUS_COLORS[currentStatus]
          )}
        >
          {RENEWAL_STATUS_LABELS[currentStatus]}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-gray-100">
        {statusOptions.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusSelect(status)}
            className="flex items-center justify-between gap-2 hover:bg-gray-200 text-xs"
          >
            <span className="flex-1">{RENEWAL_STATUS_LABELS[status]}</span>
            {currentStatus === status && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

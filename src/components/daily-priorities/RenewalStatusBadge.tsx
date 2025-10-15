/**
 * RenewalStatusBadge - Badge component for displaying and updating campaign renewal status
 */

import { useState } from 'react';
import { RenewalStatus, RENEWAL_STATUS_LABELS } from '@/types/daily-priorities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, Timer, ThumbsUp, CheckCircle, XCircle, DollarSign } from 'lucide-react';
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
  'Renewal Activated',
  'Not Renewing'
];

const statusIcons: Record<RenewalStatus, React.ReactNode> = {
  'Awaiting Confirmation': <Timer className="h-3.5 w-3.5 text-gray-600" />,
  'Confirmed - Pending Submission': <ThumbsUp className="h-3.5 w-3.5 text-orange-500" />,
  'Renewal Submitted': <CheckCircle className="h-3.5 w-3.5 text-blue-600" />,
  'Renewal Activated': <DollarSign className="h-3.5 w-3.5 text-green-600" />,
  'Not Renewing': <XCircle className="h-3.5 w-3.5 text-red-600" />
};

const statusTextColors: Record<RenewalStatus, string> = {
  'Awaiting Confirmation': 'text-gray-600',
  'Confirmed - Pending Submission': 'text-orange-500',
  'Renewal Submitted': 'text-blue-600',
  'Renewal Activated': 'text-green-600',
  'Not Renewing': 'text-red-600'
};

const statusBorderColors: Record<RenewalStatus, string> = {
  'Awaiting Confirmation': 'border-gray-600',
  'Confirmed - Pending Submission': 'border-orange-500',
  'Renewal Submitted': 'border-blue-600',
  'Renewal Activated': 'border-green-600',
  'Not Renewing': 'border-red-600'
};

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
          className={cn("h-7 gap-1.5 text-xs font-medium bg-gray-100", statusTextColors[currentStatus], statusBorderColors[currentStatus])}
        >
          {statusIcons[currentStatus]}
          {RENEWAL_STATUS_LABELS[currentStatus]}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-gray-100">
        {statusOptions.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusSelect(status)}
            className="flex items-center gap-2 hover:bg-gray-200 text-xs"
          >
            {statusIcons[status]}
            <span className={cn("flex-1", statusTextColors[status])}>
              {RENEWAL_STATUS_LABELS[status]}
            </span>
            {currentStatus === status && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

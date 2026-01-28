/**
 * StatusTrackingCard - Reusable card component for displaying renewal/launch tracking records.
 * Used by both LaunchStatusPage and RenewalsStatusPage to eliminate code duplication.
 */

import { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { RenewalStatusTracking, RenewalProcessStatus, RenewalType, RenewalStatusTrackingUpdate } from '@/types/daily-priorities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Check, RefreshCw, ExternalLink, Pencil, FileText } from 'lucide-react';

// Safe date formatting helper
const safeFormatDate = (dateString: string | null | undefined, formatStr: string, fallback: string = ''): string => {
  if (!dateString) return fallback;
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return fallback;
    return format(date, formatStr);
  } catch {
    return fallback;
  }
};

// Safe date parsing helper
const safeParseDateISO = (dateString: string | null | undefined): Date | undefined => {
  if (!dateString) return undefined;
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : undefined;
  } catch {
    return undefined;
  }
};

const STATUS_OPTIONS: RenewalProcessStatus[] = [
  'Not Started',
  'In Progress',
  'Blocked',
  'Completed'
];

const RENEWAL_TYPE_OPTIONS: RenewalType[] = [
  'Extension',
  'Relaunch',
  'NOT Renewing'
];

export interface StatusTrackingCardProps {
  record: RenewalStatusTracking;
  /** Whether this card is in the completed section */
  isCompleted?: boolean;
  /** Whether to show the Renewal Type selector (used in RenewalsStatusPage) */
  showRenewalType?: boolean;
  /** Whether to show the Notes field (default: true) */
  showNotes?: boolean;
  /** Use launch-specific labels instead of renewal labels (default: false) */
  useLaunchLabels?: boolean;
  /** Callback when a checkbox field changes */
  onCheckboxChange: (id: string, field: keyof RenewalStatusTrackingUpdate, checked: boolean) => void;
  /** Callback when status changes */
  onStatusChange: (id: string, status: RenewalProcessStatus) => void;
  /** Callback when renewal type changes */
  onRenewalTypeChange?: (id: string, type: RenewalType) => void;
  /** Callback when renewal date changes */
  onRenewalDateChange: (id: string, date: string) => void;
  /** Callback when task URL changes */
  onTaskUrlChange: (id: string, url: string | null) => void;
  /** Callback to open notes modal (only needed if showNotes is true) */
  onOpenNotesModal?: (id: string, notes: string | null) => void;
  /** Callback when delete is clicked */
  onDelete: (id: string) => void;
  /** Callback when mark complete is clicked (open records only) */
  onMarkComplete?: (id: string) => void;
  /** Callback when reopen is clicked (completed records only) */
  onReopen?: (id: string) => void;
}

/**
 * Calculate the completion percentage based on checked workflow steps.
 * @param record The tracking record
 * @param includeDspCreativeSetup Whether to include DSP Creative Setup in calculation (launch only)
 */
function getCompletionPercentage(record: RenewalStatusTracking, includeDspCreativeSetup: boolean): number {
  const steps = [
    record.project_kickoff_ticket_creation,
    record.bt_approval,
    record.bt_approved,
    record.coda_strategy,
    record.dashboard_update,
    ...(includeDspCreativeSetup ? [record.dsp_creative_setup] : []),
    record.dsp_update,
    record.pre_qa,
    record.post_qa
  ];
  const completed = steps.filter(Boolean).length;
  return Math.round((completed / steps.length) * 100);
}

export function StatusTrackingCard({
  record,
  isCompleted = false,
  showRenewalType = false,
  showNotes = true,
  useLaunchLabels = false,
  onCheckboxChange,
  onStatusChange,
  onRenewalTypeChange,
  onRenewalDateChange,
  onTaskUrlChange,
  onOpenNotesModal,
  onDelete,
  onMarkComplete,
  onReopen
}: StatusTrackingCardProps) {
  const [isEditingTaskUrl, setIsEditingTaskUrl] = useState(false);
  const [taskUrlInput, setTaskUrlInput] = useState(record.task_url || '');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const completion = getCompletionPercentage(record, useLaunchLabels);

  const handleTaskUrlSave = () => {
    onTaskUrlChange(record.id, taskUrlInput || null);
    setIsEditingTaskUrl(false);
  };

  const handleTaskUrlCancel = () => {
    setIsEditingTaskUrl(false);
    setTaskUrlInput(record.task_url || '');
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onRenewalDateChange(record.id, format(date, 'yyyy-MM-dd'));
    }
    setIsDatePickerOpen(false);
  };

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        {/* Campaign name with renewal date, progress bar, and dashboard task */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">
              {record.campaign_name}
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <span className="text-green-600 font-normal ml-2 cursor-pointer hover:underline">
                    {record.renewal_date ? (
                      `(${safeFormatDate(record.renewal_date, "MMM d, yyyy", "Invalid date")})`
                    ) : (
                      <span className="text-muted-foreground">(click to set date)</span>
                    )}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={safeParseDateISO(record.renewal_date)}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </h3>
            <div className="flex items-center gap-2">
              <Progress value={completion} className="h-1.5 w-24" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{completion}%</span>
            </div>
          </div>

          {/* Task URL section */}
          {isEditingTaskUrl ? (
            <div className="flex items-center gap-1">
              <Input
                type="url"
                placeholder="Task URL"
                value={taskUrlInput}
                onChange={(e) => setTaskUrlInput(e.target.value)}
                onBlur={handleTaskUrlSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTaskUrlSave();
                  } else if (e.key === 'Escape') {
                    handleTaskUrlCancel();
                  }
                }}
                className="h-7 text-xs w-48"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {record.task_url ? (
                <>
                  <a
                    href={record.task_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                  >
                    Dashboard Task
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTaskUrl(true);
                      setTaskUrlInput(record.task_url || '');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    title="Edit task URL"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTaskUrl(true);
                    setTaskUrlInput('');
                  }}
                  className="text-muted-foreground hover:text-foreground italic text-xs flex items-center gap-1"
                  title="Add task URL"
                >
                  No Dashboard task
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 items-start">
          {/* Left column: Status/Type/Notes */}
          <div className="flex flex-col gap-2 flex-shrink-0 border-r pr-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-24">Status:</label>
              <Select
                value={record.status}
                onValueChange={(value) => onStatusChange(record.id, value as RenewalProcessStatus)}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status} className="text-xs">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showRenewalType && onRenewalTypeChange && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground w-24">Renewal Type:</label>
                <Select
                  value={record.renewal_type}
                  onValueChange={(value) => onRenewalTypeChange(record.id, value as RenewalType)}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {RENEWAL_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showNotes && onOpenNotesModal && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground w-24">Notes:</label>
                <button
                  onClick={() => onOpenNotesModal(record.id, record.notes)}
                  className="w-[180px] h-8 text-xs text-left px-3 py-1.5 border rounded-md bg-background hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">
                    {record.notes && record.notes.trim() ? (
                      `Updated ${safeFormatDate(record.notes_updated_at || record.updated_at, "MM/dd/yy", "recently")}`
                    ) : (
                      'No notes'
                    )}
                  </span>
                  <FileText className="h-3 w-3 ml-2 flex-shrink-0" />
                </button>
              </div>
            )}
          </div>

          {/* Middle section: Checkboxes */}
          <div className="flex-1 min-w-0 flex flex-col">
            {useLaunchLabels ? (
              /* Launch Status: 3x3 grid with 9 checkboxes */
              <div className="grid grid-cols-3 gap-2 w-full">
                {/* Row 1 */}
                <CheckboxField
                  id={`${record.id}-project`}
                  checked={record.project_kickoff_ticket_creation}
                  onChange={(checked) => onCheckboxChange(record.id, 'project_kickoff_ticket_creation', checked)}
                  label="Project & Kickoff"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-bt`}
                  checked={record.bt_approval}
                  onChange={(checked) => onCheckboxChange(record.id, 'bt_approval', checked)}
                  label="BT Created"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-bt-approved`}
                  checked={record.bt_approved}
                  onChange={(checked) => onCheckboxChange(record.id, 'bt_approved', checked)}
                  label="BT Approved"
                  disabled={isCompleted}
                />
                {/* Row 2 */}
                <CheckboxField
                  id={`${record.id}-coda`}
                  checked={record.coda_strategy}
                  onChange={(checked) => onCheckboxChange(record.id, 'coda_strategy', checked)}
                  label="Coda Strategy"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-dashboard`}
                  checked={record.dashboard_update}
                  onChange={(checked) => onCheckboxChange(record.id, 'dashboard_update', checked)}
                  label="Dashboard Launch"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-dsp-creative`}
                  checked={record.dsp_creative_setup}
                  onChange={(checked) => onCheckboxChange(record.id, 'dsp_creative_setup', checked)}
                  label="DSP Creative Setup"
                  disabled={isCompleted}
                />
                {/* Row 3 */}
                <CheckboxField
                  id={`${record.id}-dsp`}
                  checked={record.dsp_update}
                  onChange={(checked) => onCheckboxChange(record.id, 'dsp_update', checked)}
                  label="DSP Launch"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-preqa`}
                  checked={record.pre_qa}
                  onChange={(checked) => onCheckboxChange(record.id, 'pre_qa', checked)}
                  label="Pre QA"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-postqa`}
                  checked={record.post_qa}
                  onChange={(checked) => onCheckboxChange(record.id, 'post_qa', checked)}
                  label="Post QA"
                  disabled={isCompleted}
                />
              </div>
            ) : (
              /* Renewals Status: 4x2 grid with 8 checkboxes (no DSP Creative Setup) */
              <div className="grid grid-cols-4 gap-2 w-full">
                {/* Row 1 */}
                <CheckboxField
                  id={`${record.id}-project`}
                  checked={record.project_kickoff_ticket_creation}
                  onChange={(checked) => onCheckboxChange(record.id, 'project_kickoff_ticket_creation', checked)}
                  label="Project & Kickoff"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-bt`}
                  checked={record.bt_approval}
                  onChange={(checked) => onCheckboxChange(record.id, 'bt_approval', checked)}
                  label="BT Updated"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-bt-approved`}
                  checked={record.bt_approved}
                  onChange={(checked) => onCheckboxChange(record.id, 'bt_approved', checked)}
                  label="BT Approved"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-coda`}
                  checked={record.coda_strategy}
                  onChange={(checked) => onCheckboxChange(record.id, 'coda_strategy', checked)}
                  label="Coda Strategy"
                  disabled={isCompleted}
                />
                {/* Row 2 */}
                <CheckboxField
                  id={`${record.id}-dashboard`}
                  checked={record.dashboard_update}
                  onChange={(checked) => onCheckboxChange(record.id, 'dashboard_update', checked)}
                  label="Dashboard Update"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-dsp`}
                  checked={record.dsp_update}
                  onChange={(checked) => onCheckboxChange(record.id, 'dsp_update', checked)}
                  label="DSP Update"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-preqa`}
                  checked={record.pre_qa}
                  onChange={(checked) => onCheckboxChange(record.id, 'pre_qa', checked)}
                  label="Pre QA"
                  disabled={isCompleted}
                />
                <CheckboxField
                  id={`${record.id}-postqa`}
                  checked={record.post_qa}
                  onChange={(checked) => onCheckboxChange(record.id, 'post_qa', checked)}
                  label="Post QA"
                  disabled={isCompleted}
                />
              </div>
            )}
          </div>

          {/* Right section: Action buttons */}
          <div className="flex flex-col gap-1 flex-shrink-0 border-l pl-3 self-center">
            {!isCompleted && onMarkComplete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkComplete(record.id)}
                className="h-8 w-8 p-0 hover:bg-green-50"
                title="Mark as complete"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
            )}
            {isCompleted && onReopen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReopen(record.id)}
                className="h-8 w-8 p-0 hover:bg-blue-50"
                title="Re-open"
              >
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(record.id)}
              className="h-8 w-8 p-0 hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper component for checkbox fields to reduce repetition.
 */
interface CheckboxFieldProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

function CheckboxField({ id, checked, onChange, label, disabled }: CheckboxFieldProps) {
  return (
    <div className="flex items-center gap-1.5 p-2 border rounded-md bg-gray-100 hover:bg-muted/50 transition-colors h-8">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(checked) => onChange(checked === true)}
        className="h-3.5 w-3.5"
        disabled={disabled}
      />
      <label
        htmlFor={id}
        className="text-sm cursor-pointer flex-1"
      >
        {label}
      </label>
    </div>
  );
}

/**
 * ChangelogModal - Shows activity log/changelog for daily priorities
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Calendar } from 'lucide-react';
import { useActivityLog, useActivityLogArchive } from '@/hooks/useActivityLog';
import { getDisplayName } from '@/config/users';
import { format } from 'date-fns';
import { ActivityLogEntry } from '@/types/activity-log';
import { SECTION_LABELS } from '@/types/daily-priorities';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to format action text
const getActionText = (entry: ActivityLogEntry): string => {
  switch (entry.action) {
    case 'created':
      return 'Created task';
    case 'updated':
      return 'Updated task';
    case 'deleted':
      return 'Deleted task';
    case 'completed':
      return 'Completed task';
    case 'reopened':
      return 'Reopened task';
    case 'blocked':
      return 'Blocked task';
    case 'unblocked':
      return 'Unblocked task';
    case 'moved_section':
      return 'Moved task';
    case 'reordered':
      return 'Reordered task';
    case 'roas_ignored':
      return 'Ignored ROAS alerts for';
    case 'roas_unignored':
      return 'Enabled ROAS alerts for';
    case 'renewal_status_updated':
      return 'Updated renewal status for';
    default:
      return entry.action;
  }
};

// Helper to format changes - returns array of change strings
const formatChanges = (changes: Record<string, unknown> | null): string[] => {
  if (!changes) return [];

  const parts: { key: string; text: string; order: number }[] = [];

  Object.entries(changes).forEach(([key, value]) => {
    // Handle simple key-value pairs (for ROAS ignore reason)
    if (key === 'reason' && typeof value === 'string') {
      parts.push({ key, text: `reason: ${value}`, order: 3 });
      return;
    }

    if (key === 'field' || typeof value !== 'object' || value === null) return;

    const changeValue = value as { before?: unknown; after?: unknown };
    const before = changeValue.before;
    const after = changeValue.after;

    // Format based on field type and assign order (assignees first, description second, others after)
    if (key === 'section') {
      const beforeLabel = SECTION_LABELS[before as keyof typeof SECTION_LABELS] || before;
      const afterLabel = SECTION_LABELS[after as keyof typeof SECTION_LABELS] || after;
      parts.push({ key, text: `section: ${beforeLabel} → ${afterLabel}`, order: 3 });
    } else if (key === 'priority_order') {
      parts.push({ key, text: `priority: #${before} → #${after}`, order: 3 });
    } else if (key === 'assignees') {
      const beforeStr = Array.isArray(before) ? before.join(', ') : 'none';
      const afterStr = Array.isArray(after) ? after.join(', ') : 'none';
      parts.push({ key, text: `assignees: ${beforeStr} → ${afterStr}`, order: 1 });
    } else if (key === 'description') {
      parts.push({ key, text: `description: ${before || '(empty)'} → ${after || '(empty)'}`, order: 2 });
    } else if (key === 'status') {
      // Renewal status changes
      const beforeStr = before || 'none';
      const afterStr = after || 'none';
      parts.push({ key, text: `${beforeStr} → ${afterStr}`, order: 3 });
    } else {
      parts.push({ key, text: `${key}: ${before || '(empty)'} → ${after || '(empty)'}`, order: 3 });
    }
  });

  // Sort by order: assignees (1), description (2), everything else (3)
  return parts.sort((a, b) => a.order - b.order).map(p => p.text);
};

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());

  const { entries: currentMonthEntries, isLoading: currentLoading } = useActivityLog(
    currentDate.getFullYear(),
    currentDate.getMonth()
  );

  const { entries: archiveEntries, isLoading: archiveLoading } = useActivityLog(
    selectedYear,
    selectedMonth
  );

  const { archive } = useActivityLogArchive();

  const renderEntry = (entry: ActivityLogEntry) => {
    const date = new Date(entry.created_at);
    const timeStr = format(date, 'MMM d, h:mm a');
    const actionText = getActionText(entry);

    // Special handling for moved_section action
    let changeLines: string[] = [];
    if (entry.action === 'moved_section') {
      if (entry.changes?.before && entry.changes?.after) {
        const beforeLabel = SECTION_LABELS[entry.changes.before as keyof typeof SECTION_LABELS] || entry.changes.before;
        const afterLabel = SECTION_LABELS[entry.changes.after as keyof typeof SECTION_LABELS] || entry.changes.after;
        changeLines = [`from ${beforeLabel} to ${afterLabel}`];
      } else {
        changeLines = ['section information not available'];
      }
    } else {
      changeLines = formatChanges(entry.changes);
    }

    // Determine if we should bold the action (when there are details after it)
    const shouldBoldAction = changeLines.length > 0;

    return (
      <div key={entry.id} className="border-b last:border-0 py-3 px-2">
        <div className="flex flex-col gap-1">
          {/* Row 1: Campaign Name or Task Name */}
          <div className="text-sm font-medium">
            {entry.task_description}
          </div>

          {/* Row 2: User and Date/Time */}
          <div className="text-xs text-muted-foreground">
            {getDisplayName(entry.user_id)} • {timeStr}
          </div>

          {/* Row 3+: Changes - each on its own line */}
          <div className="text-xs text-muted-foreground">
            {changeLines.length > 0 ? (
              changeLines.map((line, idx) => (
                <div key={idx}>
                  <span className="font-semibold">{actionText}</span> {line}
                </div>
              ))
            ) : (
              <div>{actionText}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Changelog
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">
              Current Month ({format(currentDate, 'MMMM yyyy')})
            </TabsTrigger>
            <TabsTrigger value="archive">
              <Calendar className="h-4 w-4 mr-2" />
              Archive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {currentLoading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Loading activity...
                </div>
              ) : currentMonthEntries.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center italic">
                  No activity this month
                </div>
              ) : (
                currentMonthEntries.map(renderEntry)
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="archive" className="mt-4">
            {archive.length === 0 ? (
              <ScrollArea className="h-[500px] pr-4">
                <div className="text-sm text-muted-foreground py-8 text-center italic">
                  No archived activity yet
                </div>
              </ScrollArea>
            ) : (
              <>
                <div className="mb-4">
                  <Select
                    value={`${selectedYear}-${selectedMonth}`}
                    onValueChange={(value) => {
                      const [year, month] = value.split('-');
                      setSelectedYear(parseInt(year));
                      setSelectedMonth(parseInt(month));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month..." />
                    </SelectTrigger>
                    <SelectContent>
                      {archive.map((item) => (
                        <SelectItem key={`${item.year}-${item.month}`} value={`${item.year}-${item.month}`}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[440px] pr-4">
                  {archiveLoading ? (
                    <div className="text-sm text-muted-foreground py-8 text-center">
                      Loading activity...
                    </div>
                  ) : archiveEntries.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-8 text-center italic">
                      No activity for selected month
                    </div>
                  ) : (
                    archiveEntries.map(renderEntry)
                  )}
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

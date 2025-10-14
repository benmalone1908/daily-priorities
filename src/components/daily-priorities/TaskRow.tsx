/**
 * TaskRow - Row for a single priority task with edit modal
 */

import { useState, useEffect, forwardRef } from 'react';
import { DailyPriority, DailyPriorityUpdate, PrioritySection, SECTION_LABELS } from '@/types/daily-priorities';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, ExternalLink, Pencil, MessageSquare, Check, Ban, Unlock, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabase } from '@/contexts/use-supabase';
import EditTaskModal from './EditTaskModal';
import CommentsPanel from './CommentsPanel';
import { getDisplayName } from '@/config/users';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TaskRowProps {
  priority: DailyPriority;
  onUpdate: (id: string, updates: DailyPriorityUpdate) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
  style?: React.CSSProperties;
}

const TaskRow = forwardRef<HTMLTableRowElement, TaskRowProps>(function TaskRow(
  { priority, onUpdate, onDelete, dragHandleProps, style },
  ref
) {
  const { supabase } = useSupabase();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<PrioritySection>(priority.section);
  // HIDDEN: Commenting feature temporarily disabled
  // const [commentCount, setCommentCount] = useState<number>(0);
  // const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // HIDDEN: Fetch comment count
  // useEffect(() => {
  //   const fetchCommentCount = async () => {
  //     const { count, error } = await supabase
  //       .from('priority_comments')
  //       .select('*', { count: 'exact', head: true })
  //       .eq('priority_id', priority.id);

  //     if (!error && count !== null) {
  //       setCommentCount(count);
  //     }
  //   };

  //   fetchCommentCount();
  // }, [supabase, priority.id]);

  const handleToggleComplete = () => {
    console.log('Toggle complete clicked', {
      id: priority.id,
      currentCompleted: priority.completed,
      newCompleted: !priority.completed
    });
    onUpdate(priority.id, {
      completed: !priority.completed,
      completed_at: !priority.completed ? new Date().toISOString() : null
    });
  };

  const handleSaveEdit = (updates: DailyPriorityUpdate) => {
    onUpdate(priority.id, updates);
  };

  // HIDDEN: Commenting feature temporarily disabled
  // const handleCommentAdded = () => {
  //   // Refresh comment count when a comment is added
  //   setCommentCount(prev => prev + 1);
  // };

  const handleToggleBlock = () => {
    if (priority.section === 'blocked') {
      // Unblock: move back to original section
      const targetSection = priority.original_section || 'partner_success';
      onUpdate(priority.id, {
        section: targetSection,
        original_section: null
      });
    } else {
      // Block: move to blocked section, save current section
      onUpdate(priority.id, {
        section: 'blocked',
        original_section: priority.section
      });
    }
  };

  const handleOpenMoveModal = () => {
    setSelectedSection(priority.section);
    setIsMoveModalOpen(true);
  };

  const handleMoveTask = () => {
    if (selectedSection !== priority.section) {
      onUpdate(priority.id, {
        section: selectedSection,
        original_section: null // Clear original_section when manually moving
      });
    }
    setIsMoveModalOpen(false);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <>
      <TableRow
        ref={ref}
        style={style}
        className="group hover:bg-muted/50"
      >
        {/* Drag Handle */}
        <TableCell className="w-8 p-2 border-r">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </TableCell>

        {/* Priority Number */}
        <TableCell className="w-16 p-2 text-center text-xs text-muted-foreground border-r">
          {priority.priority_order}
        </TableCell>

        {/* Agency & Client Name (stacked) */}
        <TableCell className="p-2 border-r">
          <div className="px-2 py-1 min-h-[2rem] flex flex-col justify-center">
            <div className="text-xs text-muted-foreground">
              {priority.agency_name || (
                <span className="italic">No agency</span>
              )}
            </div>
            <div className={cn(
              "font-medium text-xs",
              priority.completed && "text-muted-foreground italic line-through"
            )}>
              {priority.client_name || (
                <span className="text-muted-foreground italic text-xs">No client</span>
              )}
            </div>
          </div>
        </TableCell>

        {/* Description */}
        <TableCell className="p-2 max-w-md border-r">
          <div className="px-2 py-1 min-h-[2rem]">
            {priority.description ? (
              <div
                className={cn(
                  'whitespace-pre-wrap cursor-pointer text-xs',
                  !isDescriptionExpanded && 'line-clamp-2',
                  priority.completed && "text-muted-foreground italic line-through"
                )}
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                title={isDescriptionExpanded ? 'Click to collapse' : 'Click to expand'}
              >
                {priority.description}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-xs">No description</span>
            )}
          </div>
        </TableCell>

        {/* Assignees */}
        <TableCell className="p-2 border-r">
          <div className="px-2 py-1 min-h-[2rem] flex items-center">
            {priority.assignees && priority.assignees.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {priority.assignees.map((assignee, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                  >
                    {assignee}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-xs">No assignees</span>
            )}
          </div>
        </TableCell>

        {/* Ticket Link & Actions (stacked) */}
        <TableCell className="w-32">
          <div className="flex flex-col gap-2 py-1">
            {/* Dashboard Task Link */}
            <div className="flex justify-center">
              {priority.ticket_url && isValidUrl(priority.ticket_url) ? (
                <a
                  href={priority.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  Dashboard Task
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : priority.ticket_url ? (
                <span className="text-muted-foreground text-xs">{priority.ticket_url}</span>
              ) : (
                <span className="text-muted-foreground italic text-xs">No Dashboard task</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex -space-x-1 justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleComplete}
                title="Mark as complete"
                className="h-7 w-7"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditModalOpen(true)}
                title="Edit task"
                className="h-7 w-7"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenMoveModal}
                title="Move to another section"
                className="h-7 w-7"
              >
                <ArrowLeftRight className="h-4 w-4 text-purple-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleBlock}
                title={priority.section === 'blocked' ? 'Unblock task' : 'Block task'}
                className="h-7 w-7"
              >
                {priority.section === 'blocked' ? (
                  <Unlock className="h-4 w-4 text-blue-600" />
                ) : (
                  <Ban className="h-4 w-4 text-orange-600" />
                )}
              </Button>
              {/* HIDDEN: Commenting feature temporarily disabled */}
              {/* <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCommentsModalOpen(true)}
                className="relative h-7 w-7"
                title="View comments"
              >
                <MessageSquare className="h-4 w-4" />
                {commentCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {commentCount}
                  </span>
                )}
              </Button> */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm('Delete this task?')) {
                    onDelete(priority.id);
                  }
                }}
                title="Delete task"
                className="h-7 w-7"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        task={priority}
        // HIDDEN: onCommentAdded={handleCommentAdded}
      />

      {/* Move Task Modal */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Task to Another Section</DialogTitle>
            <DialogDescription>
              Select the section you want to move this task to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedSection} onValueChange={(value) => setSelectedSection(value as PrioritySection)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner_success">{SECTION_LABELS.partner_success}</SelectItem>
                <SelectItem value="engineering">{SECTION_LABELS.engineering}</SelectItem>
                <SelectItem value="launches">{SECTION_LABELS.launches}</SelectItem>
                <SelectItem value="pre_launch">{SECTION_LABELS.pre_launch}</SelectItem>
                <SelectItem value="ops">{SECTION_LABELS.ops}</SelectItem>
                <SelectItem value="blocked">{SECTION_LABELS.blocked}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveTask}>
              Move Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HIDDEN: Commenting feature temporarily disabled */}
      {/* <CommentsPanel
        priorityId={priority.id}
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        onCommentAdded={handleCommentAdded}
      /> */}
    </>
  );
});

export default TaskRow;

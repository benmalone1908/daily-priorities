/**
 * PrioritySection - Displays and manages priorities for a single team section
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DailyPriority, PrioritySection as PrioritySectionType, SECTION_LABELS, DailyPriorityInsert, DailyPriorityUpdate } from '@/types/daily-priorities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TaskRow from './TaskRow';
import AddTaskModal from './AddTaskModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable wrapper for TaskRow
interface SortableTaskRowProps {
  priority: DailyPriority;
  onUpdate: (id: string, updates: DailyPriorityUpdate) => void;
  onDelete: (id: string) => void;
}

function SortableTaskRow({ priority, onUpdate, onDelete }: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: priority.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TaskRow
      ref={setNodeRef}
      style={style}
      priority={priority}
      onUpdate={onUpdate}
      onDelete={onDelete}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

interface PrioritySectionProps {
  section: PrioritySectionType;
  priorities: DailyPriority[];
  date: string;
  onAddPriority: (priority: DailyPriorityInsert) => void;
  onUpdatePriority: (id: string, updates: DailyPriorityUpdate) => void;
  onDeletePriority: (id: string) => void;
  onReorderPriorities: (section: PrioritySectionType, priorityIds: string[]) => void;
}

export default function PrioritySection({
  section,
  priorities,
  date,
  onAddPriority,
  onUpdatePriority,
  onDeletePriority,
  onReorderPriorities
}: PrioritySectionProps) {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sectionTitle = SECTION_LABELS[section];
  const completedCount = priorities.filter(p => p.completed).length;
  const totalCount = priorities.length;

  const nextPriorityOrder = priorities.length > 0
    ? Math.max(...priorities.map(p => p.priority_order)) + 1
    : 1;

  const sortedPriorities = [...priorities].sort((a, b) => a.priority_order - b.priority_order);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedPriorities.findIndex(p => p.id === active.id);
      const newIndex = sortedPriorities.findIndex(p => p.id === over.id);

      const reorderedItems = arrayMove(sortedPriorities, oldIndex, newIndex);
      const priorityIds = reorderedItems.map(p => p.id);

      onReorderPriorities(section, priorityIds);
    }
  };

  return (
    <Card id={section} className="mb-6 scroll-mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{sectionTitle}</CardTitle>
            {totalCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalCount} completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {section === 'launches' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/launch-status')}
                className="gap-2"
              >
                Status Board
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {priorities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tasks for {sectionTitle.toLowerCase()}</p>
            <Button
              variant="link"
              onClick={() => setShowAddModal(true)}
              className="mt-2"
            >
              Add your first task
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <colgroup>
                  <col className="w-8" />      {/* Drag handle */}
                  <col className="w-16" />     {/* Priority # */}
                  <col className="w-48" />     {/* Agency & Client */}
                  <col className="w-96" />     {/* Description */}
                  <col className="w-40" />     {/* Assignees */}
                  <col className="w-32" />     {/* Actions */}
                </colgroup>
                <TableBody>
                  <SortableContext
                    items={sortedPriorities.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedPriorities.map((priority) => (
                      <SortableTaskRow
                        key={priority.id}
                        priority={priority}
                        onUpdate={onUpdatePriority}
                        onDelete={onDeletePriority}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
        )}
      </CardContent>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddPriority}
        section={section}
        date={date}
        nextPriorityOrder={nextPriorityOrder}
      />
    </Card>
  );
}

/**
 * Custom hook for managing daily priorities data with carry-forward support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import {
  DailyPriority,
  DailyPriorityInsert,
  DailyPriorityUpdate,
  PrioritySection
} from '@/types/daily-priorities';
import { toast } from 'sonner';
import { format, addDays, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/use-auth';
import { ActivityLogInsert, ActivityAction } from '@/types/activity-log';

export function useDailyPriorities(date: string) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // Helper function to get current user ID with fallback to localStorage
  const getCurrentUserId = (): string => {
    if (currentUser?.id) return currentUser.id;
    const storedUserId = localStorage.getItem('campaign-trends-user-id');
    return storedUserId || 'unknown';
  };

  // Helper function to log activity
  const logActivity = async (log: ActivityLogInsert) => {
    if (!supabase) {
      console.warn('Cannot log activity: Supabase not initialized');
      return;
    }

    try {
      console.log('Logging activity:', log);
      const { data, error } = await supabase.from('activity_log').insert(log).select();
      if (error) {
        console.error('Error logging activity:', error);
      } else {
        console.log('Activity logged successfully:', data);
        // Invalidate activity log queries to refresh changelog
        queryClient.invalidateQueries({ queryKey: ['activity-log'] });
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  };

  // Carry forward incomplete tasks from ALL past dates
  const carryForwardTasks = async (targetDate: string) => {
    if (!supabase) return;
    // Check if tasks already exist for target date
    const { data: existingTasks } = await supabase
      .from('daily_priorities')
      .select('id')
      .eq('active_date', targetDate)
      .limit(1);

    // If tasks already exist for this date, don't carry forward
    if (existingTasks && existingTasks.length > 0) {
      return;
    }

    // Get ALL tasks created before or on this date
    const { data: allTasks, error } = await supabase
      .from('daily_priorities')
      .select('*')
      .lte('created_date', targetDate)
      .order('active_date', { ascending: false });

    if (error || !allTasks || allTasks.length === 0) {
      return;
    }

    // Group by unique task identifier (created_date + section + client_name)
    // Keep only the most recent active_date version of each task
    const uniqueTasks = new Map<string, typeof allTasks[0]>();

    allTasks.forEach(task => {
      const key = `${task.created_date}_${task.section}_${task.client_name}`;
      if (!uniqueTasks.has(key)) {
        uniqueTasks.set(key, task);
      }
    });

    // Filter out tasks that were completed before the target date
    // A task should NOT appear on target date if:
    // - It has completed_at set, AND
    // - The completed_at date is on or before the target date
    const tasksToCarryForward = Array.from(uniqueTasks.values())
      .filter(task => {
        // If never completed, carry forward
        if (!task.completed_at) return true;

        // If completed, check the completion date
        // Task should NOT appear if it was completed before today
        const completedDate = task.completed_at.split('T')[0]; // Get YYYY-MM-DD
        return completedDate > targetDate; // Only carry forward if completed AFTER target date (shouldn't happen)
      })
      .map((task) => ({
        active_date: targetDate,
        created_date: task.created_date, // Keep original created date
        priority_order: task.priority_order,
        section: task.section,
        client_name: task.client_name,
        ticket_url: task.ticket_url,
        description: task.description,
        assignees: task.assignees,
        completed: false, // Always unchecked when carried forward
        created_by: task.created_by
      }));

    if (tasksToCarryForward.length > 0) {
      await supabase.from('daily_priorities').insert(tasksToCarryForward);
    }
  };

  // Fetch priorities for a specific date, with automatic carry-forward
  const { data: priorities = [], isLoading, error } = useQuery({
    queryKey: ['daily-priorities', date],
    queryFn: async () => {
      // First, check if we need to carry forward tasks from previous day
      await carryForwardTasks(date);

      // Then fetch tasks for this date
      const { data, error } = await supabase
        .from('daily_priorities')
        .select('*')
        .eq('active_date', date)
        .order('section')
        .order('priority_order');

      if (error) throw error;

      // Fix any negative priority_order values (from incomplete reorder operations)
      const tasksWithNegativeOrder = (data || []).filter(task => task.priority_order < 0);
      if (tasksWithNegativeOrder.length > 0) {
        console.warn('Found tasks with negative priority_order, fixing...');

        // Group by section and fix each section
        const sections = new Set(tasksWithNegativeOrder.map(t => t.section));
        for (const section of sections) {
          const sectionTasks = (data || [])
            .filter(t => t.section === section)
            .sort((a, b) => Math.abs(a.priority_order) - Math.abs(b.priority_order));

          // Update each task with correct positive order
          for (let i = 0; i < sectionTasks.length; i++) {
            await supabase
              .from('daily_priorities')
              .update({ priority_order: i + 1 })
              .eq('id', sectionTasks[i].id);
          }
        }

        // Refetch after fixing
        const { data: fixedData, error: refetchError } = await supabase
          .from('daily_priorities')
          .select('*')
          .eq('active_date', date)
          .order('section')
          .order('priority_order');

        if (refetchError) throw refetchError;
        return fixedData as DailyPriority[];
      }

      return data as DailyPriority[];
    },
    enabled: !!supabase
  });

  // Add a new priority
  const addPriority = useMutation({
    mutationFn: async (priority: DailyPriorityInsert) => {
      if (!supabase) throw new Error('Supabase not initialized');

      // First, check if there are existing tasks at or after this priority order in the same section
      const { data: existingTasks } = await supabase
        .from('daily_priorities')
        .select('id, priority_order')
        .eq('active_date', priority.active_date)
        .eq('section', priority.section)
        .gte('priority_order', priority.priority_order)
        .order('priority_order', { ascending: false }); // Order descending to update from highest to lowest

      // Shift existing tasks down by incrementing their priority_order
      if (existingTasks && existingTasks.length > 0) {
        for (const task of existingTasks) {
          await supabase
            .from('daily_priorities')
            .update({ priority_order: task.priority_order + 1 })
            .eq('id', task.id);
        }
      }

      // Now insert the new task at the requested priority order
      const { data, error } = await supabase
        .from('daily_priorities')
        .insert(priority)
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await logActivity({
        priority_id: data.id,
        user_id: getCurrentUserId(),
        action: 'created',
        task_description: data.client_name || 'Unnamed task',
        changes: null
      });

      return data as DailyPriority;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-priorities', date] });
      toast.success('Priority added');
    },
    onError: (error) => {
      console.error('Error adding priority:', error);
      toast.error('Failed to add priority');
    }
  });

  // Update a priority
  const updatePriority = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DailyPriorityUpdate }) => {
      console.log('updatePriority mutation called', { id, updates });
      if (!supabase) throw new Error('Supabase not initialized');

      // If marking as complete, we need special handling
      if (updates.completed === true) {
        console.log('Marking task as complete');
        // Get the task to find its details
        const { data: task } = await supabase
          .from('daily_priorities')
          .select('*')
          .eq('id', id)
          .single();

        if (task) {
          // 1. Mark ONLY this instance (this date) as complete
          const { error: updateError } = await supabase
            .from('daily_priorities')
            .update({
              completed: true,
              completed_at: new Date().toISOString(),
              updated_by: currentUser?.id || null
            })
            .eq('id', id);

          if (updateError) throw updateError;

          // Log completion
          await logActivity({
            priority_id: id,
            user_id: getCurrentUserId(),
            action: 'completed',
            task_description: task.client_name || 'Unnamed task',
            changes: null
          });

          // 2. Delete all FUTURE instances of this task (active_date > current date)
          const { error: deleteError } = await supabase
            .from('daily_priorities')
            .delete()
            .eq('created_date', task.created_date)
            .eq('section', task.section)
            .eq('client_name', task.client_name)
            .gt('active_date', task.active_date);

          if (deleteError) throw deleteError;

          // 3. Past instances remain unchanged (still unchecked)

          // Invalidate all date queries to refresh
          queryClient.invalidateQueries({ queryKey: ['daily-priorities'] });
          return task;
        }
      }

      // If unchecking a completed task, we need to restore it to future dates
      if (updates.completed === false) {
        const { data: task } = await supabase
          .from('daily_priorities')
          .select('*')
          .eq('id', id)
          .single();

        if (task && task.completed) {
          // Mark this instance as incomplete
          const { error: updateError } = await supabase
            .from('daily_priorities')
            .update({
              completed: false,
              completed_at: null,
              updated_by: currentUser?.id || null
            })
            .eq('id', id);

          if (updateError) throw updateError;

          // Log reopening
          await logActivity({
            priority_id: id,
            user_id: getCurrentUserId(),
            action: 'reopened',
            task_description: task.client_name || 'Unnamed task',
            changes: null
          });

          // Invalidate queries so carry-forward will recreate future instances
          queryClient.invalidateQueries({ queryKey: ['daily-priorities'] });
          return task;
        }
      }

      // If changing section (blocking/unblocking), handle priority_order
      if (updates.section !== undefined) {
        const { data: task } = await supabase
          .from('daily_priorities')
          .select('*')
          .eq('id', id)
          .single();

        if (task) {
          const oldSection = task.section;
          const oldPriorityOrder = task.priority_order;

          // Get the max priority_order in the target section
          const { data: sectionTasks } = await supabase
            .from('daily_priorities')
            .select('priority_order')
            .eq('active_date', task.active_date)
            .eq('section', updates.section)
            .order('priority_order', { ascending: false })
            .limit(1);

          const nextPriorityOrder = sectionTasks && sectionTasks.length > 0
            ? sectionTasks[0].priority_order + 1
            : 1;

          // Update with new section and priority_order
          const { data, error } = await supabase
            .from('daily_priorities')
            .update({
              ...updates,
              priority_order: nextPriorityOrder,
              updated_by: currentUser?.id || null
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          // Determine specific action for logging
          const action: ActivityAction = updates.section === 'blocked' ? 'blocked' :
                                         oldSection === 'blocked' ? 'unblocked' :
                                         'moved_section';

          // Log the section change
          await logActivity({
            priority_id: id,
            user_id: getCurrentUserId(),
            action,
            task_description: task.client_name || 'Unnamed task',
            changes: {
              field: 'section',
              before: oldSection,
              after: updates.section
            }
          });

          // Reorder remaining tasks in the old section to close the gap
          const { data: remainingTasks } = await supabase
            .from('daily_priorities')
            .select('id, priority_order')
            .eq('active_date', task.active_date)
            .eq('section', oldSection)
            .gt('priority_order', oldPriorityOrder)
            .order('priority_order', { ascending: true });

          if (remainingTasks && remainingTasks.length > 0) {
            // Decrement priority_order for all tasks after the removed one
            for (const remainingTask of remainingTasks) {
              await supabase
                .from('daily_priorities')
                .update({ priority_order: remainingTask.priority_order - 1 })
                .eq('id', remainingTask.id);
            }
          }

          return data as DailyPriority;
        }
      }

      // For other updates, just update this specific record
      // Get current task data for logging
      const { data: currentTask } = await supabase
        .from('daily_priorities')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('daily_priorities')
        .update({
          ...updates,
          updated_by: currentUser?.id || null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log the update with changes
      if (currentTask) {
        const changes: Record<string, { before: unknown; after: unknown }> = {};
        Object.keys(updates).forEach(key => {
          const typedKey = key as keyof DailyPriorityUpdate;
          if (key !== 'updated_by' && currentTask[typedKey] !== updates[typedKey]) {
            changes[key] = {
              before: currentTask[typedKey],
              after: updates[typedKey]
            };
          }
        });

        if (Object.keys(changes).length > 0) {
          await logActivity({
            priority_id: id,
            user_id: getCurrentUserId(),
            action: 'updated',
            task_description: data.client_name || 'Unnamed task',
            changes
          });
        }
      }

      return data as DailyPriority;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-priorities', date] });
      queryClient.invalidateQueries({ queryKey: ['daily-priorities'] });
    },
    onError: (error) => {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  });

  // Delete a priority - deletes ALL instances (all dates) of this task
  const deletePriority = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      // Get the task to find its details
      const { data: task } = await supabase
        .from('daily_priorities')
        .select('*')
        .eq('id', id)
        .single();

      if (!task) throw new Error('Task not found');

      // Delete ALL instances of this task (same created_date, section, client_name)
      const { error } = await supabase
        .from('daily_priorities')
        .delete()
        .eq('created_date', task.created_date)
        .eq('section', task.section)
        .eq('client_name', task.client_name);

      if (error) throw error;

      // Log the deletion
      await logActivity({
        priority_id: null, // Task is deleted
        user_id: getCurrentUserId(),
        action: 'deleted',
        task_description: task.client_name || 'Unnamed task',
        changes: null
      });

      // Get all remaining tasks in this section on this date with higher priority_order
      const { data: tasksToReorder } = await supabase
        .from('daily_priorities')
        .select('id, priority_order')
        .eq('active_date', task.active_date)
        .eq('section', task.section)
        .gt('priority_order', task.priority_order)
        .order('priority_order');

      // Reorder remaining tasks by decrementing their priority_order
      if (tasksToReorder && tasksToReorder.length > 0) {
        for (const taskToReorder of tasksToReorder) {
          await supabase
            .from('daily_priorities')
            .update({ priority_order: taskToReorder.priority_order - 1 })
            .eq('id', taskToReorder.id);
        }
      }

      return task;
    },
    onSuccess: () => {
      // Invalidate all queries to refresh all dates
      queryClient.invalidateQueries({ queryKey: ['daily-priorities'] });
      toast.success('Priority deleted');
    },
    onError: (error) => {
      console.error('Error deleting priority:', error);
      toast.error('Failed to delete priority');
    }
  });

  // Reorder priorities within a section
  const reorderPriorities = useMutation({
    mutationFn: async ({ section, priorityIds }: { section: PrioritySection; priorityIds: string[] }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      // To avoid unique constraint violations, we need to:
      // 1. First set all priority_order values to negative (temporary values)
      // 2. Then set them to their final positive values

      // Step 1: Set all to negative temporary values
      for (let i = 0; i < priorityIds.length; i++) {
        const { error } = await supabase
          .from('daily_priorities')
          .update({ priority_order: -(i + 1) })
          .eq('id', priorityIds[i]);

        if (error) {
          console.error('Supabase error details (step 1):', JSON.stringify(error, null, 2));
          throw error;
        }
      }

      // Step 2: Set to final positive values
      for (let i = 0; i < priorityIds.length; i++) {
        const { error } = await supabase
          .from('daily_priorities')
          .update({ priority_order: i + 1 })
          .eq('id', priorityIds[i]);

        if (error) {
          console.error('Supabase error details (step 2):', JSON.stringify(error, null, 2));
          throw error;
        }
      }

      // Log the reorder activity for each task that was reordered
      for (let i = 0; i < priorityIds.length; i++) {
        const { data: task } = await supabase
          .from('daily_priorities')
          .select('client_name')
          .eq('id', priorityIds[i])
          .single();

        if (task) {
          await logActivity({
            priority_id: priorityIds[i],
            user_id: getCurrentUserId(),
            action: 'reordered',
            task_description: task.client_name || 'Unnamed task',
            changes: {
              section: section,
              new_order: i + 1
            }
          });
        }
      }
    },
    onMutate: async ({ section, priorityIds }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['daily-priorities', date] });

      // Snapshot the previous value
      const previousPriorities = queryClient.getQueryData(['daily-priorities', date]);

      // Optimistically update to the new value
      queryClient.setQueryData(['daily-priorities', date], (old: DailyPriority[] | undefined) => {
        if (!old) return old;

        return old.map(priority => {
          const newIndex = priorityIds.indexOf(priority.id);
          if (newIndex !== -1) {
            return { ...priority, priority_order: newIndex + 1 };
          }
          return priority;
        });
      });

      return { previousPriorities };
    },
    onError: (error: Error, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousPriorities) {
        queryClient.setQueryData(['daily-priorities', date], context.previousPriorities);
      }
      console.error('Error reordering priorities:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(`Failed to reorder: ${error?.message || 'Unknown error'}`);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ['daily-priorities', date] });
    }
  });

  // Get the next available priority order for a section
  const getNextPriorityOrder = (section: PrioritySection): number => {
    const sectionPriorities = priorities.filter(p => p.section === section);
    return sectionPriorities.length > 0
      ? Math.max(...sectionPriorities.map(p => p.priority_order)) + 1
      : 1;
  };

  return {
    priorities,
    isLoading,
    error,
    addPriority: addPriority.mutate,
    updatePriority: (id: string, updates: DailyPriorityUpdate) => updatePriority.mutate({ id, updates }),
    deletePriority: deletePriority.mutate,
    reorderPriorities: (section: PrioritySection, priorityIds: string[]) => reorderPriorities.mutate({ section, priorityIds }),
    getNextPriorityOrder,
    isAddingPriority: addPriority.isPending,
    isUpdatingPriority: updatePriority.isPending,
    isDeletingPriority: deletePriority.isPending
  };
}

// Hook for getting dates that have priorities (for calendar highlighting)
export function usePriorityDates() {
  const { supabase } = useSupabase();

  return useQuery({
    queryKey: ['priority-dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_priorities')
        .select('active_date')
        .order('active_date', { ascending: false });

      if (error) throw error;

      // Get unique dates
      const uniqueDates = [...new Set(data.map(d => d.active_date))];
      return uniqueDates;
    },
    enabled: !!supabase
  });
}

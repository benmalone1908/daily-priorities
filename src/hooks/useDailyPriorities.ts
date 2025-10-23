/**
 * Custom hook for managing daily priorities data with carry-forward support
 *
 * TASK IDENTITY MODEL:
 * - Tasks are uniquely identified by: (client_name + created_at timestamp)
 * - created_at: Auto-generated database timestamp when task is first created (IMMUTABLE, primary identity)
 * - created_date: Legacy DATE field preserved for backwards compatibility (should eventually be removed)
 * - active_date: The date when a task appears in the daily list (tasks can appear on multiple dates)
 *
 * CARRY-FORWARD BEHAVIOR:
 * - Incomplete tasks automatically appear on future dates until completed
 * - Each appearance is a separate database record with the same created_at but different active_date
 * - Updating secondary fields (agency_name, description, etc.) syncs across ALL dates
 * - Updating primary identity (client_name) only affects the current date (creates new identity)
 */

import { useEffect } from 'react';
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

  // Helper function to get current user ID
  const getCurrentUserId = (): string => {
    if (!currentUser?.id) {
      console.error('getCurrentUserId called but currentUser is not set!', {
        currentUser,
        timestamp: new Date().toISOString()
      });
    }
    return currentUser?.id || 'unknown';
  };

  // Helper function to log activity
  const logActivity = async (log: ActivityLogInsert) => {
    if (!supabase) {
      console.warn('Cannot log activity: Supabase not initialized');
      return;
    }

    try {
      const { error } = await supabase.from('activity_log').insert(log).select();
      if (error) {
        console.error('Error logging activity:', error);
      } else {
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
    if (!supabase) {
      return;
    }

    // First get existing tasks on target date
    const { data: existingTasksOnTarget } = await supabase
      .from('daily_priorities')
      .select('*')
      .eq('active_date', targetDate);

    // Get ALL incomplete tasks from dates before today (using active_date, not created_date)
    const { data: allTasks, error } = await supabase
      .from('daily_priorities')
      .select('*')
      .lt('active_date', targetDate)
      .eq('completed', false)
      .order('active_date', { ascending: false });

    if (error || !allTasks || allTasks.length === 0) {
      return;
    }

    // Create a set of existing task keys for quick lookup
    // Task identity: (client_name + created_at) - created_at is the immutable timestamp
    const existingKeys = new Set(
      (existingTasksOnTarget || []).map(
        t => `${t.client_name}_${t.created_at}`
      )
    );

    // Get max priority_order for each section on target date
    const maxPriorityBySection: Record<string, number> = {};
    (existingTasksOnTarget || []).forEach(task => {
      const currentMax = maxPriorityBySection[task.section] || 0;
      maxPriorityBySection[task.section] = Math.max(currentMax, task.priority_order);
    });

    // Group by unique task identifier (client_name + created_at timestamp)
    // Keep only the MOST RECENT active_date version of each task (which has the latest section/details)
    const uniqueTasks = new Map<string, typeof allTasks[0]>();

    allTasks.forEach(task => {
      const key = `${task.client_name}_${task.created_at}`;
      if (!uniqueTasks.has(key)) {
        // First time seeing this task, add it
        uniqueTasks.set(key, task);
      } else {
        // Task already exists, keep the one with the most recent active_date
        const existing = uniqueTasks.get(key)!;
        if (task.active_date > existing.active_date) {
          uniqueTasks.set(key, task);
        }
      }
    });

    // Filter out tasks that were completed before the target date
    // A task should NOT appear on target date if:
    // - It has completed_at set, AND
    // - The completed_at date is on or before the target date
    const filteredTasks = Array.from(uniqueTasks.values())
      .filter(task => {
        const key = `${task.client_name}_${task.created_at}`;

        // Skip if task already exists on target date (in ANY section)
        if (existingKeys.has(key)) return false;

        // If never completed, carry forward
        if (!task.completed_at) return true;

        // If completed, check the completion date
        // Task should NOT appear if it was completed before today
        const completedDate = task.completed_at.split('T')[0]; // Get YYYY-MM-DD
        return completedDate > targetDate; // Only carry forward if completed AFTER target date (shouldn't happen)
      });

    // Sort by section and priority_order to maintain order
    filteredTasks.sort((a, b) => {
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      return a.priority_order - b.priority_order;
    });

    // Build a map of used priorities per section (from existing tasks on target date)
    const usedPrioritiesBySection: Record<string, Set<number>> = {};
    (existingTasksOnTarget || []).forEach(task => {
      if (!usedPrioritiesBySection[task.section]) {
        usedPrioritiesBySection[task.section] = new Set();
      }
      usedPrioritiesBySection[task.section].add(task.priority_order);
    });

    // Now map to new tasks, preserving original priority_order but adjusting for conflicts
    const tasksToCarryForward = filteredTasks.map((task) => {
      const section = task.section;

      // Get or create the used priorities set for this section
      if (!usedPrioritiesBySection[section]) {
        usedPrioritiesBySection[section] = new Set();
      }
      const usedPriorities = usedPrioritiesBySection[section];

      let newPriority = task.priority_order;

      // If there's a conflict, find the next available priority
      while (usedPriorities.has(newPriority)) {
        newPriority++;
      }

      // Mark this priority as used for subsequent tasks
      usedPriorities.add(newPriority);
      maxPriorityBySection[section] = Math.max(maxPriorityBySection[section] || 0, newPriority);

      return {
        active_date: targetDate,
        created_date: task.created_date, // Preserve for backwards compatibility
        priority_order: newPriority, // Preserve original order, adjust for conflicts
        section: task.section, // Use the most recent section
        agency_name: task.agency_name, // Preserve agency name
        client_name: task.client_name,
        ticket_url: task.ticket_url,
        description: task.description,
        assignees: task.assignees,
        completed: false, // Always unchecked when carried forward
        created_by: task.created_by,
        created_at: task.created_at // CRITICAL: Preserve original created_at for task identity
      };
    });

    if (tasksToCarryForward.length > 0) {
      // Use ignoreDuplicates option to prevent errors when tasks already exist
      // This is safer than catching and ignoring error codes
      const { error: insertError } = await supabase
        .from('daily_priorities')
        .insert(tasksToCarryForward, { ignoreDuplicates: true });

      if (insertError) {
        console.error('Error carrying forward tasks:', insertError);
      }
    }
  };

  // Fetch priorities for a specific date, with automatic carry-forward
  const { data: priorities = [], isLoading, error } = useQuery({
    queryKey: ['daily-priorities', date],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    queryFn: async () => {
      // Fetch tasks for this date - maintains historical record
      const { data, error } = await supabase
        .from('daily_priorities')
        .select('*')
        .eq('active_date', date)
        .order('section')
        .order('priority_order');

      if (error) {
        console.error('Error fetching priorities:', error);
        throw error;
      }

      // Normalize priority_order values to ensure sequential ordering (1, 2, 3, 4...)
      // This fixes:
      // 1. Negative values from incomplete reorder operations
      // 2. Gaps in sequence (e.g., 1,2,3,4,6,7,8,9,18,31,49)
      // 3. Duplicate priority orders within a section

      const needsNormalization = (data || []).some(task => task.priority_order < 0);

      // Check for gaps or duplicates by section
      const sectionMap = new Map<string, DailyPriority[]>();
      (data || []).forEach(task => {
        if (!sectionMap.has(task.section)) {
          sectionMap.set(task.section, []);
        }
        sectionMap.get(task.section)!.push(task);
      });

      let hasGapsOrDuplicates = false;
      for (const [section, tasks] of sectionMap.entries()) {
        const orders = tasks.map(t => t.priority_order).sort((a, b) => a - b);
        // Check if orders are sequential starting from 1
        for (let i = 0; i < orders.length; i++) {
          if (orders[i] !== i + 1) {
            hasGapsOrDuplicates = true;
            break;
          }
        }
        if (hasGapsOrDuplicates) break;
      }

      if (needsNormalization || hasGapsOrDuplicates) {
        console.warn('Found priority_order issues, normalizing...');

        // Normalize each section
        for (const [section, tasks] of sectionMap.entries()) {
          // Sort by current priority_order to maintain relative positioning
          const sortedTasks = tasks.sort((a, b) => a.priority_order - b.priority_order);

          // Update each task with sequential order (1, 2, 3, 4...)
          for (let i = 0; i < sortedTasks.length; i++) {
            if (sortedTasks[i].priority_order !== i + 1) {
              await supabase
                .from('daily_priorities')
                .update({ priority_order: i + 1 })
                .eq('id', sortedTasks[i].id);
            }
          }
        }

        // Refetch after normalizing
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

  // Subscribe to realtime changes for collaborative updates
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('daily-priorities-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'daily_priorities',
          filter: `active_date=eq.${date}` // Only listen to changes for current date
        },
        (payload) => {
          // Invalidate query to refetch data and update all connected users
          queryClient.invalidateQueries({ queryKey: ['daily-priorities', date] });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or date change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, date, queryClient]);

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
      if (!supabase) throw new Error('Supabase not initialized');

      // If marking as complete, we need special handling
      if (updates.completed === true) {
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
          // Use created_at (immutable timestamp) for task identity, not created_date
          let deleteQuery = supabase
            .from('daily_priorities')
            .delete()
            .gt('active_date', task.active_date);

          // Match on task identity: (client_name + created_at)
          if (task.client_name === null) {
            deleteQuery = deleteQuery.is('client_name', null);
          } else {
            deleteQuery = deleteQuery.eq('client_name', task.client_name);
          }
          deleteQuery = deleteQuery.eq('created_at', task.created_at);

          const { error: deleteError } = await deleteQuery;

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

      // For other updates, we need to handle carefully
      // Get current task data for logging AND to identify all instances
      const { data: currentTask } = await supabase
        .from('daily_priorities')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentTask) throw new Error('Task not found');

      // Check if we're updating fields that define task identity
      // PRIMARY IDENTITY: (client_name + created_at timestamp)
      // - created_at is IMMUTABLE (set by database, never changes)
      // - client_name is the only user-editable identity field
      // - Changing client_name creates a NEW task identity (only affects current date)
      //
      // SECONDARY FIELDS: (agency_name, description, ticket_url, assignees)
      // - These should sync across ALL instances of the same task (all active_dates)
      const isChangingPrimaryIdentity = updates.client_name !== undefined;

      const isUpdatingSecondaryFields =
        updates.agency_name !== undefined ||
        updates.description !== undefined ||
        updates.ticket_url !== undefined ||
        updates.assignees !== undefined;

      if (isChangingPrimaryIdentity) {
        // When changing primary identity (client_name), only update this single record
        // This is effectively creating a new task identity
        const { data, error } = await supabase
          .from('daily_priorities')
          .update({
            ...updates,
            updated_by: currentUser?.id || null
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Single update error:', { error, updates });
          throw new Error(`Failed to update task: ${error.message}`);
        }

        // Log the update
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

        return data as DailyPriority;
      } else if (isUpdatingSecondaryFields) {
        // Update ALL instances of this task (same client_name + created_at across all dates)
        // This ensures the task remains consistent across all dates
        //
        // Task identity: (client_name + created_at)
        // - created_at is the immutable database timestamp that uniquely identifies this task
        // - We match on BOTH fields to find all instances of this specific task

        // IMPORTANT: Validate that we can safely identify this task
        // If created_at is null, we cannot reliably identify task instances
        if (!currentTask.created_at) {
          throw new Error('Cannot update task: missing created_at timestamp. This task may be corrupted.');
        }

        // Build the query carefully to handle null values
        let query = supabase
          .from('daily_priorities')
          .update({
            ...updates,
            updated_by: currentUser?.id || null
          });

        // Handle null client_name properly
        if (currentTask.client_name === null) {
          query = query.is('client_name', null);
        } else {
          query = query.eq('client_name', currentTask.client_name);
        }

        // Match on created_at timestamp for unique identification (IMMUTABLE primary identity)
        query = query.eq('created_at', currentTask.created_at);

        const { error: bulkUpdateError } = await query;

        if (bulkUpdateError) {
          console.error('Bulk update error:', {
            error: bulkUpdateError,
            updates,
            currentTask: {
              client_name: currentTask.client_name,
              created_at: currentTask.created_at
            }
          });
          throw new Error(`Failed to update all task instances: ${bulkUpdateError.message}`);
        }

        // Fetch the updated record for this specific date to return
        const { data, error } = await supabase
          .from('daily_priorities')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        // Log the update with changes
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

        return data as DailyPriority;
      } else {
        // For non-identity updates (like priority_order), only update this specific record
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

        return data as DailyPriority;
      }
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

      // Delete ALL instances of this task (same client_name + created_at across all dates)
      // Task identity: (client_name + created_at timestamp)

      // IMPORTANT: Validate that we can safely identify this task
      // If created_at is null, we cannot reliably identify task instances
      if (!task.created_at) {
        throw new Error('Cannot delete task: missing created_at timestamp. This task may be corrupted.');
      }

      let deleteQuery = supabase
        .from('daily_priorities')
        .delete();

      // Handle null client_name properly
      if (task.client_name === null) {
        deleteQuery = deleteQuery.is('client_name', null);
      } else {
        deleteQuery = deleteQuery.eq('client_name', task.client_name);
      }

      // Match on created_at timestamp (IMMUTABLE primary identity)
      deleteQuery = deleteQuery.eq('created_at', task.created_at);

      const { error } = await deleteQuery;

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

      // To avoid unique constraint violations during reorder:
      // Use a transaction-like approach with temporary negative values
      // This prevents conflicts even if realtime triggers a refetch mid-operation

      // Step 1: Set all to large negative temporary values (to avoid conflicts)
      const updates1 = priorityIds.map((id, i) =>
        supabase
          .from('daily_priorities')
          .update({ priority_order: -(1000 + i) }) // Use large negative numbers
          .eq('id', id)
      );

      const results1 = await Promise.all(updates1);
      const error1 = results1.find(r => r.error);
      if (error1?.error) {
        console.error('Supabase error details (step 1):', JSON.stringify(error1.error, null, 2));
        throw error1.error;
      }

      // Step 2: Set to final positive values
      const updates2 = priorityIds.map((id, i) =>
        supabase
          .from('daily_priorities')
          .update({ priority_order: i + 1 })
          .eq('id', id)
      );

      const results2 = await Promise.all(updates2);
      const error2 = results2.find(r => r.error);
      if (error2?.error) {
        console.error('Supabase error details (step 2):', JSON.stringify(error2.error, null, 2));
        throw error2.error;
      }

      // Log the reorder activity for each task that was reordered
      // Fetch all tasks in one query for better performance
      const { data: tasks } = await supabase
        .from('daily_priorities')
        .select('id, client_name')
        .in('id', priorityIds);

      if (tasks) {
        for (let i = 0; i < priorityIds.length; i++) {
          const task = tasks.find(t => t.id === priorityIds[i]);
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

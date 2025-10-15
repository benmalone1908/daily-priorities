/**
 * Types for Activity Log / Changelog feature
 */

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'completed'
  | 'reopened'
  | 'blocked'
  | 'unblocked'
  | 'moved_section'
  | 'reordered'
  | 'roas_ignored'
  | 'roas_unignored'
  | 'renewal_status_updated';

export interface ActivityLogEntry {
  id: string;
  priority_id: string | null;
  user_id: string;
  action: ActivityAction;
  task_description: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityLogInsert {
  priority_id?: string | null;
  user_id: string;
  action: ActivityAction;
  task_description: string;
  changes?: Record<string, unknown> | null;
}

export interface ActivityLogGrouped {
  date: string;
  entries: ActivityLogEntry[];
}

/**
 * Types for Resources feature
 */

export type ResourceType = 'url' | 'file';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  url: string | null;
  file_name: string | null;
  file_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceInsert {
  title: string;
  description?: string | null;
  resource_type: ResourceType;
  url?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  created_by: string;
}

export interface ResourceUpdate {
  title?: string;
  description?: string | null;
  url?: string | null;
}

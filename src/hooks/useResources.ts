/**
 * Custom hook for managing resources
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { Resource, ResourceInsert, ResourceUpdate } from '@/types/resources';
import { toast } from 'sonner';

export function useResources() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  // Fetch all resources
  const { data: resources = [], isLoading, error } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching resources:', error);
        throw error;
      }

      return (data || []) as Resource[];
    },
    enabled: !!supabase
  });

  // Add resource mutation
  const addResource = useMutation({
    mutationFn: async (resource: ResourceInsert) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('resources')
        .insert(resource)
        .select()
        .single();

      if (error) throw error;
      return data as Resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource added');
    },
    onError: (error) => {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    }
  });

  // Update resource mutation
  const updateResource = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ResourceUpdate }) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('resources')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource updated');
    },
    onError: (error) => {
      console.error('Error updating resource:', error);
      toast.error('Failed to update resource');
    }
  });

  // Delete resource mutation
  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource deleted');
    },
    onError: (error) => {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  });

  return {
    resources,
    isLoading,
    error,
    addResource: (resource: ResourceInsert) => addResource.mutate(resource),
    updateResource: (id: string, updates: ResourceUpdate) => updateResource.mutate({ id, updates }),
    deleteResource: (id: string) => deleteResource.mutate(id)
  };
}

/**
 * Custom hook for managing announcements
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { Announcement, AnnouncementInsert } from '@/types/announcements';
import { toast } from 'sonner';

export function useAnnouncements() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  // Fetch active announcements (not expired)
  const { data: announcements = [], isLoading, error } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        throw error;
      }

      return (data || []) as Announcement[];
    },
    enabled: !!supabase,
    // Refetch every 5 minutes to check for expired announcements
    refetchInterval: 5 * 60 * 1000
  });

  // Subscribe to realtime changes for collaborative updates
  useEffect(() => {
    if (!supabase) return;

    console.log('📢 Setting up realtime subscription for announcements...');

    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          console.log('📢 Realtime change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
        }
      )
      .subscribe((status) => {
        console.log('📢 Subscription status:', status);
      });

    return () => {
      console.log('📢 Cleaning up realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Add announcement mutation
  const addAnnouncement = useMutation({
    mutationFn: async (announcement: AnnouncementInsert) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('announcements')
        .insert(announcement)
        .select()
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement added');
    },
    onError: (error) => {
      console.error('Error adding announcement:', error);
      toast.error('Failed to add announcement');
    }
  });

  // Delete announcement mutation
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error) => {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  });

  return {
    announcements,
    isLoading,
    error,
    addAnnouncement: (announcement: AnnouncementInsert) => addAnnouncement.mutate(announcement),
    deleteAnnouncement: (id: string) => deleteAnnouncement.mutate(id)
  };
}

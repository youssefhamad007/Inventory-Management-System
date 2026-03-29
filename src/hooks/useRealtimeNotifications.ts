import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to listen for realtime inventory and notification changes via Supabase.
 * Uses the centralized supabase client for consistent auth and session state.
 */
export function useRealtimeNotifications() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('nexus-ops-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'stock_levels',
                },
                (payload) => {
                    console.log('[Realtime] Stock update detected:', payload);
                    queryClient.invalidateQueries({ queryKey: ['stock'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[Realtime] Security alert received:', payload);
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Connected to operational matrix.');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[Realtime] Terminal error connecting to matrix.');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, user?.id]);
}

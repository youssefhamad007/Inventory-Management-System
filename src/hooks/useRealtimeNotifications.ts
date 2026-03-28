import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Hook to listen for realtime inventory and notification changes via Supabase.
 * Uses the centralized supabase client for consistent auth and session state.
 */
export function useRealtimeNotifications() {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Listen for all changes on the inventory and notifications tables
        const channel = supabase
            .channel('nexus-ops-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'stock_levels', // Standardized table name
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
    }, [queryClient]);
}

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to listen for realtime inventory changes via Supabase.
 */
export function useRealtimeNotifications() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('public:inventory_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'stock_levels',
                },
                (payload: any) => {
                    console.log('Realtime stock change received:', payload);
                    queryClient.invalidateQueries({ queryKey: ['stock'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload: any) => {
                    console.log('Realtime notification received:', payload);
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to realtime updates.');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Failed to subscribe to realtime updates.');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}

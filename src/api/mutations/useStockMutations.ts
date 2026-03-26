import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adjustStock } from '@/api/services';

import type { StockLevel } from '../../types/schema';

export interface DefaultStockResponse {
    success: boolean;
    quantity_before: number;
    quantity_after: number;
    low_stock_alert: boolean;
}

export interface AdjustStockPayload {
    product_id: string;
    branch_id: string;
    quantity_change: number;
    txn_type: string;
    notes?: string;
}

export function useAdjustStockMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: AdjustStockPayload) => {
            return adjustStock(payload) as Promise<DefaultStockResponse>;
        },
        // Optimistic Update Implementation
        onMutate: async (newAdjustment) => {
            await queryClient.cancelQueries({ queryKey: ['stock'] });
            const previousStock = queryClient.getQueryData(['stock']);

            queryClient.setQueryData(['stock'], (old: StockLevel[] | undefined) => {
                if (!old) return old;
                return old.map((item: StockLevel) => {
                    if (
                        item.product_id === newAdjustment.product_id &&
                        item.branch_id === newAdjustment.branch_id
                    ) {
                        return {
                            ...item,
                            quantity: item.quantity + newAdjustment.quantity_change,
                        };
                    }
                    return item;
                });
            });

            toast.info('Adjusting stock...', { id: 'stock-adjust' });
            return { previousStock };
        },
        onError: (err, _newAdjustment, context) => {
            if (context?.previousStock) {
                queryClient.setQueryData(['stock'], context.previousStock);
            }
            toast.error('Stock adjustment failed. Reverting changes.', { id: 'stock-adjust' });
            console.error(err);
        },
        onSuccess: (data) => {
            toast.success('Stock adjusted successfully!', { id: 'stock-adjust' });
            if (data.low_stock_alert) {
                toast.warning('Warning: This adjustment resulted in low stock.');
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
        },
    });
}

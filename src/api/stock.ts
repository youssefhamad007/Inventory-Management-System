import { apiClient } from './client';
import type { StockLevel } from '@/types/schema';

export async function fetchStockLevels(params?: { branch_id?: string; product_id?: string }): Promise<StockLevel[]> {
    const { data } = await apiClient.get('stock', { params });
    return data;
}

export async function adjustStock(payload: {
    product_id: string;
    branch_id: string;
    quantity_change: number;
    txn_type: string;
    notes?: string;
}) {
    const { data } = await apiClient.post('stock/adjust', payload);
    return data;
}

export async function transferStock(payload: {
    product_id: string;
    from_branch_id: string;
    to_branch_id: string;
    quantity: number;
    notes?: string;
}) {
    const { data } = await apiClient.post('stock/transfer', payload);
    return data;
}

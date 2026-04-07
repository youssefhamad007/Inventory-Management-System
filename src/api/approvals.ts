import { apiClient } from './client';

export interface PendingApproval {
    id: string;
    product_id: string;
    branch_id: string;
    txn_type: string;
    quantity_change: number;
    requesting_user_id: string;
    created_at: string;
    product?: {
        name: string;
        sku: string;
    };
    branch?: {
        name: string;
    };
    requester?: {
        full_name: string;
    };
}

export async function fetchApprovals(): Promise<PendingApproval[]> {
    const { data } = await apiClient.get('approvals');
    return data;
}

export async function approveAdjustment(id: string) {
    const { data } = await apiClient.post(`approvals/${id}/approve`);
    return data;
}

export async function rejectAdjustment(id: string) {
    const { data } = await apiClient.post(`approvals/${id}/reject`);
    return data;
}

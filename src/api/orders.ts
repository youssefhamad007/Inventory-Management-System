import { apiClient } from './client';

export async function fetchOrders(params?: { order_type?: string; status?: string; branch_id?: string }) {
    const { data } = await apiClient.get('orders', { params });
    return data;
}

export async function fetchOrder(id: string) {
    const { data } = await apiClient.get(`orders/${id}`);
    return data;
}

export async function createOrder(order: any) {
    const { data } = await apiClient.post('orders', order);
    return data;
}

export async function updateOrderStatus(id: string, status: string) {
    const { data } = await apiClient.put(`orders/${id}/status`, { status });
    return data;
}

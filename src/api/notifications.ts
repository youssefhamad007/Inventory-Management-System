import { apiClient } from './client';

export async function fetchNotifications() {
    const { data } = await apiClient.get('/api/v1/notifications/');
    return data;
}

export async function markAllNotificationsRead() {
    const { data } = await apiClient.post('/api/v1/notifications/mark-all-read');
    return data;
}

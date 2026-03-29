import { apiClient } from './client';

export async function fetchNotifications() {
    const { data } = await apiClient.get('notifications');
    return data;
}

export async function markAllNotificationsRead() {
    const { data } = await apiClient.post('notifications/mark-all-read');
    return data;
}

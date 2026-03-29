import { apiClient } from './client';

export async function fetchUsers() {
    const { data } = await apiClient.get('users');
    return data;
}

export async function fetchMe() {
    const { data } = await apiClient.get('users/me');
    return data;
}

export async function updateUserRole(id: string, payload: { role: string; branch_id?: string }) {
    const { data } = await apiClient.put(`users/${id}/role`, payload);
    return data;
}

export async function createUser(payload: any) {
    const { data } = await apiClient.post('users/create', payload);
    return data;
}

export async function deleteUser(id: string) {
    const { data } = await apiClient.delete(`users/${id}`);
    return data;
}

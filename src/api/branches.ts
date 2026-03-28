import { apiClient } from './client';

export async function fetchBranches() {
    const { data } = await apiClient.get('/api/v1/branches');
    return data;
}

export async function createBranch(branch: { name: string; address?: string; phone?: string }) {
    const { data } = await apiClient.post('/api/v1/branches', branch);
    return data;
}

export async function updateBranch(id: string, branch: Record<string, unknown>) {
    const { data } = await apiClient.put(`/api/v1/branches/${id}`, branch);
    return data;
}

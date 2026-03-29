import { apiClient } from './client';
import type { Branch } from '@/types/schema';

export async function fetchBranches(): Promise<Branch[]> {
    const { data } = await apiClient.get('branches');
    return data;
}

export async function createBranch(branch: { name: string; address?: string; phone?: string }) {
    const { data } = await apiClient.post('branches', branch);
    return data;
}

export async function updateBranch(id: string, branch: Record<string, unknown>) {
    const { data } = await apiClient.put(`branches/${id}`, branch);
    return data;
}

export async function deleteBranch(id: string) {
    const { data } = await apiClient.delete(`branches/${id}`);
    return data;
}

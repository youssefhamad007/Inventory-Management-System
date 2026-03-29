import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
    id: string;
    full_name: string | null;
    role: 'admin' | 'manager' | 'staff';
    branch_id: string | null;
    is_active: boolean;
}

export function useProfile() {
    const { user, session } = useAuth();

    return useQuery<UserProfile | null>({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            // Fetch profile strictly from the backend API
            const { data } = await apiClient.get('users/me');
            return data as UserProfile;
        },
        enabled: !!user?.id && !!session,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
}

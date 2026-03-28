import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-black">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary shadow-[0_0_20px_rgba(0,184,217,0.4)]" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

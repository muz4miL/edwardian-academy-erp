import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, loading } = useAuth();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-yellow-500 mx-auto" />
                    <p className="text-slate-400 text-sm">Verifying authentication...</p>
                </div>
            </div>
        );
    }

    // If not authenticated, redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If authenticated, render the protected content
    return <>{children}</>;
};

export default ProtectedRoute;

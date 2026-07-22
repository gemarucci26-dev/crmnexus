import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md px-4">
          <div className="h-8 bg-[var(--hover)] rounded" />
          <div className="h-4 bg-[var(--hover)] rounded w-3/4" />
          <div className="h-4 bg-[var(--hover)] rounded w-1/2" />
          <div className="h-10 bg-[var(--hover)] rounded mt-4" />
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Layout } from '@/components/layout/Layout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Lazy load route pages for automatic code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const ProductsPage = lazy(() => import('@/pages/ProductsPage').then(module => ({ default: module.ProductsPage })));
const StockPage = lazy(() => import('@/pages/StockPage').then(module => ({ default: module.StockPage })));
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then(module => ({ default: module.OrdersPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then(module => ({ default: module.UsersPage })));
const BranchesPage = lazy(() => import('@/pages/BranchesPage').then(module => ({ default: module.BranchesPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(module => ({ default: module.ReportsPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

const LoadingSpinner = (
  <div className="flex p-8 justify-center items-center">
    <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <Suspense fallback={LoadingSpinner}>
          <LoginPage />
        </Suspense>
      } />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={
            <Suspense fallback={LoadingSpinner}>
              <DashboardPage />
            </Suspense>
          } />
          <Route path="products" element={<Suspense fallback={LoadingSpinner}><ProductsPage /></Suspense>} />
          <Route path="stock" element={<Suspense fallback={LoadingSpinner}><StockPage /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={LoadingSpinner}><OrdersPage /></Suspense>} />
          <Route path="users" element={<Suspense fallback={LoadingSpinner}><UsersPage /></Suspense>} />
          <Route path="branches" element={<Suspense fallback={LoadingSpinner}><BranchesPage /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={LoadingSpinner}><ReportsPage /></Suspense>} />
          <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

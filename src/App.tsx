import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';

// Lazy load route pages
const LoginPage = lazy(() => import('@/pages/LoginPage').then(module => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const ProductsPage = lazy(() => import('@/pages/ProductsPage').then(module => ({ default: module.ProductsPage })));
const StockPage = lazy(() => import('@/pages/StockPage').then(module => ({ default: module.StockPage })));
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then(module => ({ default: module.OrdersPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then(module => ({ default: module.UsersPage })));
const BranchesPage = lazy(() => import('@/pages/BranchesPage').then(module => ({ default: module.BranchesPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(module => ({ default: module.ReportsPage })));

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Suspense fallback={null}>
          <LoginPage />
        </Suspense>
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true, element: (
          <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" /></div>}>
            <DashboardPage />
          </Suspense>
        )
      },
      { path: 'products', element: <Suspense fallback={null}><ProductsPage /></Suspense> },
      { path: 'stock', element: <Suspense fallback={null}><StockPage /></Suspense> },
      { path: 'orders', element: <Suspense fallback={null}><OrdersPage /></Suspense> },
      { path: 'users', element: <Suspense fallback={null}><UsersPage /></Suspense> },
      { path: 'branches', element: <Suspense fallback={null}><BranchesPage /></Suspense> },
      { path: 'reports', element: <Suspense fallback={null}><ReportsPage /></Suspense> },
      { path: '*', element: <Suspense fallback={null}><NotFoundPage /></Suspense> },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" expand={false} richColors />
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

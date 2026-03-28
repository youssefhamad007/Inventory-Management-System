import { apiClient } from './client';

// ─── Dashboard ───────────────────────────────────
export async function fetchDashboardSummary() {
  const { data } = await apiClient.get('/v1/dashboard/summary');
  return data;
}

export async function fetchAnalytics() {
  const { data } = await apiClient.get('/v1/dashboard/analytics');
  return data;
}

// ─── Products ────────────────────────────────────
export async function fetchProducts(params?: { search?: string; category_id?: string; supplier_id?: string }) {
  const { data } = await apiClient.get('/v1/products', { params });
  return data;
}

export async function fetchProduct(id: string) {
  const { data } = await apiClient.get(`/v1/products/${id}`);
  return data;
}

export async function createProduct(product: {
  name: string;
  sku: string;
  unit_price: number;
  cost_price?: number;
  min_stock_level?: number;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  barcode?: string;
}) {
  const { data } = await apiClient.post('/v1/products', product);
  return data;
}

export async function updateProduct(id: string, product: Record<string, unknown>) {
  const { data } = await apiClient.put(`/v1/products/${id}`, product);
  return data;
}

export async function deleteProduct(id: string) {
  const { data } = await apiClient.delete(`/v1/products/${id}`);
  return data;
}

// ─── Stock ───────────────────────────────────────
export async function fetchStockLevels(params?: { branch_id?: string; product_id?: string }) {
  const { data } = await apiClient.get('/v1/stock', { params });
  return data;
}

export async function adjustStock(payload: {
  product_id: string;
  branch_id: string;
  quantity_change: number;
  txn_type: string;
  notes?: string;
}) {
  const { data } = await apiClient.post('/v1/stock/adjust', payload);
  return data;
}

export async function transferStock(payload: {
  product_id: string;
  from_branch_id: string;
  to_branch_id: string;
  quantity: number;
  notes?: string;
}) {
  const { data } = await apiClient.post('/v1/stock/transfer', payload);
  return data;
}

// ─── Orders ──────────────────────────────────────
export async function fetchOrders(params?: { order_type?: string; status?: string; branch_id?: string }) {
  const { data } = await apiClient.get('/v1/orders', { params });
  return data;
}

export async function fetchOrder(id: string) {
  const { data } = await apiClient.get(`/v1/orders/${id}`);
  return data;
}

export async function createOrder(order: Record<string, unknown>) {
  const { data } = await apiClient.post('/v1/orders', order);
  return data;
}

export async function updateOrderStatus(id: string, status: string) {
  const { data } = await apiClient.put(`/v1/orders/${id}/status`, { status });
  return data;
}

// ─── Branches ────────────────────────────────────
export async function fetchBranches() {
  const { data } = await apiClient.get('/v1/branches');
  return data;
}

export async function createBranch(branch: { name: string; address?: string; phone?: string }) {
  const { data } = await apiClient.post('/v1/branches', branch);
  return data;
}

export async function updateBranch(id: string, branch: Record<string, unknown>) {
  const { data } = await apiClient.put(`/v1/branches/${id}`, branch);
  return data;
}

// ─── Users ───────────────────────────────────────
export async function fetchUsers() {
  const { data } = await apiClient.get('/v1/users');
  return data;
}

export async function updateUserRole(id: string, payload: { role: string; branch_id?: string }) {
  const { data } = await apiClient.put(`/v1/users/${id}`, payload);
  return data;
}

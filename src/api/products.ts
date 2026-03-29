import { apiClient } from './client';

export async function fetchProducts(params?: { search?: string; category_id?: string; supplier_id?: string }) {
    const { data } = await apiClient.get('products', { params });
    return data;
}

export async function fetchProduct(id: string) {
    const { data } = await apiClient.get(`products/${id}`);
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
    is_active?: boolean;
}) {
    const { data } = await apiClient.post('products', product);
    return data;
}

export async function updateProduct(id: string, product: Record<string, unknown>) {
    const { data } = await apiClient.put(`products/${id}`, product);
    return data;
}

export async function deleteProduct(id: string) {
    const { data } = await apiClient.delete(`products/${id}`);
    return data;
}

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, PackageSearch, X, Loader2, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { Product } from '@/types/schema';
import { toast } from 'sonner';

import { fetchProducts, createProduct, deleteProduct, updateProduct } from '@/api/products';
import { useProfile } from '@/hooks/useProfile';

export function ProductsPage() {
    const { data: profile, isLoading: isProfileLoading } = useProfile();
    const canCreate = !isProfileLoading && (profile?.role === 'admin' || profile?.role === 'manager');
    const queryClient = useQueryClient();

    const [isSlideOverOpen, setIsSlideOverOpen] = React.useState(false);
    const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
    const [globalFilter, setGlobalFilter] = React.useState('');
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 12 });

    const { data: products, isLoading } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: () => fetchProducts(),
    });

    const createMutation = useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleCloseDrawer();
            toast.success('Product registered successfully');
        },
        onError: (err: any) => {
            const detail = err.response?.data?.detail;
            toast.error(detail || 'Failed to register product');
        }
    });

    const editMutation = useMutation({
        mutationFn: (data: { id: string, payload: any }) => updateProduct(data.id, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleCloseDrawer();
            toast.success('Product updated successfully');
        },
        onError: (err: any) => {
            const detail = err.response?.data?.detail;
            toast.error(detail || 'Failed to update product');
        }
    });

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = {
            name: formData.get('name') as string,
            sku: formData.get('sku') as string,
            unit_price: Number(formData.get('price')),
            is_active: true
        };

        if (editingProduct) {
            editMutation.mutate({ id: editingProduct.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product deactivated');
        },
        onError: () => toast.error('Failed to deactivate product')
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to deactivate this product?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleCloseDrawer = () => {
        setIsSlideOverOpen(false);
        setEditingProduct(null);
    };

    const isDrawerOpen = isSlideOverOpen || !!editingProduct;
    const isPending = createMutation.isPending || editMutation.isPending;

    const columns: ColumnDef<Product>[] = [
        {
            accessorKey: 'sku',
            header: 'SKU',
            cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.sku}</span>
        },
        {
            accessorKey: 'name',
            header: 'Product Name',
            cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>
        },
        {
            accessorKey: 'category.name',
            header: 'Category',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.category?.name || 'GENERIC'}</span>,
        },
        {
            accessorKey: 'unit_price',
            header: 'Retail Price',
            cell: ({ row }) => <span className="font-bold text-white text-lg">${Number(row.original.unit_price ?? 0).toFixed(2)}</span>,
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            cell: ({ row }) => (
                <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
                    row.original.is_active ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground"
                )}>
                    {row.original.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex justify-end gap-2 pr-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/20 hover:text-primary"
                        onClick={() => setEditingProduct(row.original)}
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive text-destructive/50 hover:text-destructive"
                        onClick={() => handleDelete(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,184,217,0.4)]">Master Catalog</h1>
                    <p className="text-muted-foreground mt-1">Manage global product registry and pricing.</p>
                </div>
                {canCreate && (
                    <Button
                        className="shadow-[0_0_15px_rgba(0,184,217,0.3)] hover:shadow-[0_0_25px_rgba(0,184,217,0.5)] transition-all"
                        onClick={() => setIsSlideOverOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Button>
                )}
            </div>

            <div className="flex-1 min-h-0 flex flex-col bg-muted/20 backdrop-blur-md border border-white/5 rounded-xl text-card-foreground shadow-lg p-6 relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="mb-4 flex items-center justify-between gap-4 relative z-10 shrink-0">
                    <div className="relative max-w-sm w-full">
                        <PackageSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search catalog index..."
                            className="pl-9 bg-black/40 border-white/10"
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <DataTable
                        columns={columns}
                        data={(Array.isArray(products) ? products : []).filter(p =>
                            p.is_active && (
                                p.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
                                p.sku?.toLowerCase().includes(globalFilter.toLowerCase())
                            )
                        )}
                        pageCount={1}
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        sorting={[]}
                        onSortingChange={() => { }}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* Slide-over for Create / Edit Product */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div
                        className="w-full max-w-md h-full border-l border-white/10 bg-black/95 backdrop-blur-2xl p-8 shadow-2xl animate-in slide-in-from-right"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-primary">
                                {editingProduct ? 'Update Product Data' : 'New Registry Entry'}
                            </h2>
                            <Button variant="ghost" size="icon" onClick={handleCloseDrawer}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Product Name</label>
                                <Input key={`name-${editingProduct?.id || 'new'}`} name="name" required defaultValue={editingProduct?.name || ''} placeholder="e.g. Ergonomic Office Chair" className="bg-white/5 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest">SKU</label>
                                <Input key={`sku-${editingProduct?.id || 'new'}`} name="sku" required defaultValue={editingProduct?.sku || ''} placeholder="CHR-001" className="bg-white/5 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Retail Price ($)</label>
                                <Input key={`price-${editingProduct?.id || 'new'}`} name="price" type="number" step="0.01" min="0" required defaultValue={editingProduct?.unit_price || ''} placeholder="0.00" className="bg-white/5 border-white/10" />
                            </div>

                            <div className="pt-8 flex gap-3">
                                <Button type="button" variant="outline" onClick={handleCloseDrawer} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={isPending} className="flex-1 shadow-[0_0_20px_rgba(0,184,217,0.3)]">
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Commit Record
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

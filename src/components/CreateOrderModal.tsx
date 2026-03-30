import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/api/products';
import { fetchBranches } from '@/api/branches';
import { createOrder } from '@/api/orders';
import type { Product, Branch, OrderType } from '@/types/schema';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
    const queryClient = useQueryClient();
    const [orderType, setOrderType] = useState<OrderType>('sale');
    const [branchId, setBranchId] = useState('');
    const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([
        { product_id: '', quantity: 1, unit_price: 0 }
    ]);

    const { data: products } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => fetchProducts() });
    const { data: branches } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: () => fetchBranches() });

    const mutation = useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Manifest Confirmed', {
                description: `Economic transaction has been logged in the ledger.`
            });
            onClose();
        },
        onError: () => {
            toast.error('Logistic Failure', {
                description: 'Unable to commit manifest to the ledger.'
            });
        }
    });

    const addItem = () => setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }]);
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx: number, updates: any) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], ...updates };

        // Auto-fill price if product selected
        if (updates.product_id) {
            const p = products?.find((p) => p.id === updates.product_id);
            if (p) newItems[idx].unit_price = orderType === 'sale' ? p.unit_price : p.cost_price;
        }
        setItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!branchId || items.some(i => !i.product_id)) {
            toast.error('Validation Error', { description: 'Incomplete coordinate data detected.' });
            return;
        }
        mutation.mutate({
            order_type: orderType,
            branch_id: branchId,
            items
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-black/95 border-white/10 backdrop-blur-2xl text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight">Initiate Logistic Manifest</DialogTitle>
                    </div>
                    <DialogDescription className="sr-only">Create a new order by selecting products and specifying quantities.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-[0.2em] text-primary/70">Operation Type</Label>
                            <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black/95 border-white/10">
                                    <SelectItem value="sale">Direct Sale (Outgoing)</SelectItem>
                                    <SelectItem value="purchase">Procurement (Incoming)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-[0.2em] text-primary/70">Operational Center</Label>
                            <Select value={branchId} onValueChange={setBranchId}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Select Branch" />
                                </SelectTrigger>
                                <SelectContent className="bg-black/95 border-white/10">
                                    {branches?.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase tracking-[0.2em] text-primary/70">Resource Manifest</Label>
                            <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-7 text-[10px] border border-white/5 hover:bg-primary/20 hover:text-primary transition-all">
                                <Plus className="mr-1 h-3 w-3" /> Add Resource
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-end gap-3 p-3 rounded-lg bg-white/5 border border-white/5 group transition-all hover:bg-white/10">
                                    <div className="flex-1 space-y-2">
                                        <Select
                                            value={item.product_id}
                                            onValueChange={(v) => updateItem(idx, { product_id: v })}
                                        >
                                            <SelectTrigger className="bg-transparent border-white/10 h-8 text-xs">
                                                <SelectValue placeholder="Select Resource" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-black/95 border-white/10">
                                                {products?.filter((p) => p.is_active).map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-20">
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) })}
                                            className="h-8 bg-transparent border-white/10 text-xs"
                                            placeholder="Qty"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <Input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) })}
                                            className="h-8 bg-transparent border-white/10 text-xs text-primary"
                                            placeholder="Price"
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-muted-foreground">Total Manifest Value</span>
                            <span className="text-xl font-black text-white">
                                ${items.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/5">Abort</Button>
                            <Button
                                type="submit"
                                disabled={mutation.isPending}
                                className="bg-primary text-black font-bold hover:bg-primary/90"
                            >
                                {mutation.isPending ? 'Committing...' : 'Commit Manifest'}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

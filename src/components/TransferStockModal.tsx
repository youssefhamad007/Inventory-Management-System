import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/api/branches';
import { fetchStockLevels, transferStock } from '@/api/stock';
import type { StockLevel, Branch } from '@/types/schema';

interface TransferStockModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TransferStockModal({ isOpen, onClose }: TransferStockModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        product_id: '',
        from_branch_id: '',
        to_branch_id: '',
        quantity: 1,
        notes: ''
    });

    const { data: branches } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: fetchBranches });
    const { data: stock } = useQuery<StockLevel[]>({
        queryKey: ['stock-lookup'],
        queryFn: () => fetchStockLevels(),
        enabled: isOpen
    });

    // Filter stock to show only items that actually exist in the source branch
    const availableProducts = (Array.isArray(stock) ? stock : []).filter(s => s.branch_id === formData.from_branch_id);

    const mutation = useMutation({
        mutationFn: transferStock,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            toast.success('Logistics Success', {
                description: 'Stock has been successfully rerouted between operational centers.'
            });
            onClose();
            setFormData({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: 1, notes: '' });
        },
        onError: () => {
            toast.error('Logistics Failure', {
                description: 'Unable to synchronize stock transfer across the network.'
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.from_branch_id === formData.to_branch_id) {
            toast.error('Coordination Error', { description: 'Source and destination coordinates must be distinct.' });
            return;
        }
        mutation.mutate(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] bg-black/95 border-white/10 backdrop-blur-2xl text-white">
                <DialogHeader>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                            <ArrowRightLeft className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight">Reroute Resources</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground">Transfer inventory between operational hubs.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-blue-400/70">Origin Hub</Label>
                            <Select
                                value={formData.from_branch_id}
                                onValueChange={(v) => setFormData({ ...formData, from_branch_id: v, product_id: '' })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-xs">
                                    <SelectValue placeholder="Source" />
                                </SelectTrigger>
                                <SelectContent className="bg-black/95 border-white/10">
                                    {branches?.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-blue-400/70">Target Hub</Label>
                            <Select
                                value={formData.to_branch_id}
                                onValueChange={(v) => setFormData({ ...formData, to_branch_id: v })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-xs">
                                    <SelectValue placeholder="Destination" />
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
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-blue-400/70">Resource Link</Label>
                            <Select
                                value={formData.product_id}
                                onValueChange={(v) => setFormData({ ...formData, product_id: v })}
                                disabled={!formData.from_branch_id}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-xs">
                                    <div className="flex items-center">
                                        <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder={formData.from_branch_id ? "Select current stock" : "Select Origin Hub first"} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-black/95 border-white/10">
                                    {availableProducts.map((s: StockLevel) => (
                                        <SelectItem key={s.id} value={s.product_id}>
                                            {s.product?.name} (Avail: {s.quantity})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-blue-400/70">Transfer Quantity</Label>
                            <Input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                className="bg-white/5 border-white/10 focus:border-blue-500/50"
                                min="1"
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/5">Abort</Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending || !formData.product_id}
                            className="bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                        >
                            {mutation.isPending ? 'Syncing...' : 'Initiate Transfer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

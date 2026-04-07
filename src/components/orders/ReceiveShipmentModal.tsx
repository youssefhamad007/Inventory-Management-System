import React, { useState, useEffect } from 'react';
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
import { PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { receiveOrder } from '@/api/orders';
import type { Order } from '@/types/schema';

interface ReceiveShipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
}

export function ReceiveShipmentModal({ isOpen, onClose, order }: ReceiveShipmentModalProps) {
    const queryClient = useQueryClient();
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        if (order?.items) {
            const initial: Record<string, number> = {};
            order.items.forEach(item => {
                initial[item.product_id] = item.quantity; // default full receipt
            });
            setQuantities(initial);
        }
    }, [order]);

    const mutation = useMutation({
        mutationFn: async (payload: { items: { product_id: string, received_quantity: number }[] }) => {
            if (!order) throw new Error("No order selected");
            return receiveOrder(order.id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            toast.success('Shipment Received', {
                description: `Inventory updated for order ${order?.order_number}`
            });
            onClose();
        },
        onError: () => {
            toast.error('Tactical Failure', {
                description: 'Failed to process shipment receipt.'
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;

        const payload = {
            items: Object.entries(quantities).map(([product_id, qty]) => ({
                product_id,
                received_quantity: qty
            }))
        };

        mutation.mutate(payload);
    };

    if (!order) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-black/95 border-white/10 backdrop-blur-2xl text-white">
                <DialogHeader>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
                            <PackageCheck className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight">Receive Shipment</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Log physical receipt of goods for {order.order_number}. Enter actual quantities received to support partial fulfillment.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        {order.items?.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">{(item as any).product?.name || 'Unknown Product'}</p>
                                    <p className="text-xs text-muted-foreground">Ordered: {item.quantity}</p>
                                </div>
                                <div className="w-24">
                                    <Label className="sr-only">Received Qty</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={item.quantity}
                                        value={quantities[item.product_id] ?? 0}
                                        onChange={(e) => setQuantities(prev => ({ ...prev, [item.product_id]: parseInt(e.target.value) || 0 }))}
                                        className="bg-black/50 border-white/10 text-center"
                                        required
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="pt-4 sticky bottom-0 bg-black/95">
                        <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/5">
                            Abort
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                            className="bg-emerald-500 text-black font-bold hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        >
                            {mutation.isPending ? 'Processing...' : 'Confirm Receipt'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

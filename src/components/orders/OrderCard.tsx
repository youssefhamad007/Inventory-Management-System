import { motion } from 'framer-motion';
import { Clock, MapPin, ExternalLink } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/schema';

interface OrderCardProps {
    order: Order;
    onClick?: () => void;
    isDragging?: boolean;
    disabled?: boolean;
}

export function OrderCard({ order, onClick, isDragging, disabled }: OrderCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: order.id, disabled });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const statusConfig: Record<string, { color: string; label: string }> = {
        draft: { color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', label: 'DRAFT' },
        confirmed: { color: 'bg-primary/10 text-primary border-primary/20', label: 'CONFIRMED' },
        shipped: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'SHIPPED' },
        delivered: { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'DELIVERED' },
        cancelled: { color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'CANCELLED' },
    };

    const config = statusConfig[order.status] || statusConfig.draft;

    return (
        <motion.div
            layout
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onClick}
            className={cn(
                "group relative flex flex-col rounded-xl border border-white/5 bg-black/40 p-4 shadow-xl transition-all hover:border-primary/40 hover:bg-black/60 cursor-pointer",
                isDragging && "z-50 border-primary/50 shadow-primary/20"
            )}
        >
            {/* Glow Effect */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="flex items-start justify-between mb-3">
                <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{order.order_number}</span>
                    <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                        {order.order_type === 'purchase' ? 'Procurement' : 'Direct Sale'}
                    </h4>
                </div>
                <Badge variant="outline" className={cn("text-[9px] h-5 font-bold tracking-tighter", config.color)}>
                    {config.label}
                </Badge>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center text-[11px] text-muted-foreground">
                    <MapPin className="mr-1.5 h-3 w-3" />
                    {order.branch?.name || 'Main Branch'}
                </div>
                <div className="flex items-center text-[11px] text-muted-foreground">
                    <Clock className="mr-1.5 h-3 w-3" />
                    {new Date(order.created_at).toLocaleDateString()}
                </div>
            </div>

            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase">Total Value</span>
                    <span className="text-sm font-extrabold text-white">${Number(order.total_amount ?? 0).toLocaleString()}</span>
                </div>
                <div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-black transition-all">
                    <ExternalLink className="h-3.5 w-3.5" />
                </div>
            </div>
        </motion.div>
    );
}

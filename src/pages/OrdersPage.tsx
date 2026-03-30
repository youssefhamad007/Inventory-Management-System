import * as React from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    PackagePlus,
    CheckCircle2,
    Clock,
    Truck,
    FileText
} from 'lucide-react';
import { toast } from 'sonner';

import { updateOrderStatus, fetchOrders } from '@/api/orders';
import { KanbanColumn } from '@/components/orders/KanbanColumn';
import { OrderCard } from '@/components/orders/OrderCard';
import { CreateOrderModal } from '@/components/CreateOrderModal';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import type { Order, OrderStatus } from '@/types/schema';

const COLUMNS: { id: OrderStatus; label: string; icon: any; color: string }[] = [
    { id: 'draft', label: 'Draft', icon: FileText, color: 'text-muted-foreground' },
    { id: 'confirmed', label: 'Confirmed', icon: Clock, color: 'text-amber-500' },
    { id: 'shipped', label: 'In Transit', icon: Truck, color: 'text-primary' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-500' },
];

export function OrdersPage() {
    const queryClient = useQueryClient();
    const { data: profile, isLoading: isProfileLoading } = useProfile();
    // Staff can also manage orders
    const canManageOrders = !isProfileLoading && (profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'staff');

    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [localOrders, setLocalOrders] = React.useState<Order[]>([]);

    const { data: orders } = useQuery<Order[]>({
        queryKey: ['orders'],
        queryFn: () => fetchOrders(),
    });

    React.useEffect(() => {
        if (orders) setLocalOrders(orders);
    }, [orders]);

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: OrderStatus }) => updateOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['stock'] }); // Stock might change on delivery
            toast.success('Order status updated');
        },
        onError: () => {
            toast.error('Failed to update order status');
            // Revert local state on error
            if (orders) setLocalOrders(orders);
        }
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findContainer = (id: string) => {
        if (COLUMNS.find(c => c.id === id)) return id as OrderStatus;
        const order = localOrders.find(o => o.id === id);
        return order ? order.status : null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id as string);
        const overContainer = findContainer(overId as string);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setLocalOrders((prev) => {
            return prev.map(o =>
                o.id === active.id ? { ...o, status: overContainer } : o
            );
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId) {
            setActiveId(null);
            return;
        }

        const activeContainer = findContainer(active.id as string);
        const overContainer = findContainer(overId as string);

        if (activeContainer && overContainer) {
            // Trigger actual API update
            mutation.mutate({ id: active.id as string, status: overContainer });
        }

        setActiveId(null);
    };

    const activeOrder = activeId ? localOrders.find(o => o.id === activeId) : null;

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary drop-shadow-[0_0_8px_rgba(0,184,217,0.5)]">
                        Logistics & Orders
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Drag and drop shipments to update their fulfillment status in real-time.
                    </p>
                </div>
                {canManageOrders && (
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="shadow-[0_0_15px_rgba(0,184,217,0.3)] hover:shadow-[0_0_25px_rgba(0,184,217,0.5)] transition-shadow"
                    >
                        <PackagePlus className="mr-2 h-4 w-4" /> New Order
                    </Button>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {COLUMNS.map((col) => (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.label}
                            icon={col.icon}
                            color={col.color}
                            count={localOrders.filter(o => o.status === col.id).length}
                        >
                            <SortableContext
                                items={localOrders.filter(o => o.status === col.id).map(o => o.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-4">
                                    {localOrders
                                        .filter(o => o.status === col.id)
                                        .map((order) => (
                                            <OrderCard key={order.id} order={order} disabled={!canManageOrders} />
                                        ))}
                                </div>
                            </SortableContext>
                        </KanbanColumn>
                    ))}
                </div>

                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: { active: { opacity: '0.5' } },
                    }),
                }}>
                    {activeOrder ? <OrderCard order={activeOrder} isDragging disabled={!canManageOrders} /> : null}
                </DragOverlay>
            </DndContext>

            <CreateOrderModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
            />
        </div>
    );
}

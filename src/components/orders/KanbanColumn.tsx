import { MoreHorizontal, Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
    title: string;
    count: number;
    id: string;
    icon: any;
    color: string;
    children: React.ReactNode;
}

export function KanbanColumn({ title, count, id, icon: Icon, color, children }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col w-full h-fit min-h-[150px] gap-4 transition-colors rounded-2xl p-2",
                isOver && "bg-white/5"
            )}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between py-3 px-2 mb-2 border-b border-white/5">
                <div className="flex items-center space-x-2">
                    <div className={cn("h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,184,217,0.8)]", color.replace('text-', 'bg-'))} />
                    <Icon className={cn("h-4 w-4", color)} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono text-muted-foreground">
                        {count}
                    </span>
                </div>
                <button className="text-muted-foreground hover:text-white transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </div>

            {/* Column Content */}
            <div className="flex-1 flex flex-col space-y-4 min-h-[80px]">
                {children}

                {/* Empty State / Add Placeholder */}
                {count === 0 && (
                    <div className="flex-1 rounded-xl border border-dashed border-white/5 flex flex-col items-center justify-center p-4 py-6 text-center text-muted-foreground group hover:border-primary/20 transition-all">
                        <div className="p-2 rounded-full bg-white/5 mb-2 group-hover:bg-primary/10 transition-all">
                            <Plus className="h-4 w-4 group-hover:text-primary transition-all" />
                        </div>
                        <span className="text-xs">No {title.toLowerCase()} orders</span>
                    </div>
                )}
            </div>
        </div>
    );
}

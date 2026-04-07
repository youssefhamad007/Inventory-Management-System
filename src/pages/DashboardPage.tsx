import {
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Clock,
    CheckCircle2,
    DollarSign
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary } from '@/api/dashboard';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { ApprovalsWidget } from '@/components/dashboard/ApprovalsWidget';

interface DashboardStats {
    total_inventory_value: number;
    low_stock_alerts: any[];
    order_summary: {
        pending: number;
        delivered: number;
    };
    recent_transactions: any[];
}

export function DashboardPage() {
    const { data: profile, isLoading: isProfileLoading } = useProfile();
    const isManager = !isProfileLoading && (profile?.role === 'admin' || profile?.role === 'manager');

    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: () => fetchDashboardSummary(),
        refetchInterval: 30000, // Refresh every 30s
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Activity className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const cards = [
        {
            title: 'Inventory Value',
            value: `$${Number(stats?.total_inventory_value ?? 0).toLocaleString()}`,
            icon: DollarSign,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            trend: '+12.5%',
            isPositive: true
        },
        {
            title: 'Low Stock Alerts',
            value: stats?.low_stock_alerts?.length || 0,
            icon: AlertTriangle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            trend: stats?.low_stock_alerts?.length === 0 ? 'Optimal' : `Attention Required`,
            isPositive: stats?.low_stock_alerts?.length === 0
        },
        {
            title: 'Pending Orders',
            value: stats?.order_summary?.pending ?? 0,
            icon: Clock,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            trend: 'Next 24h',
            isPositive: true
        },
        {
            title: 'Delivered (MTD)',
            value: stats?.order_summary?.delivered ?? 0,
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            trend: '+5 from last week',
            isPositive: true
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(0,184,217,0.3)]">
                    System Overview
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Real-time telemetry and inventory performance metrics.
                </p>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card, idx) => (
                    <div
                        key={idx}
                        className="group relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 shadow-2xl transition-all hover:border-primary/50 hover:bg-black/60"
                    >
                        <div className="flex items-center justify-between">
                            <div className={cn("rounded-xl p-3 transition-transform group-hover:scale-110", card.bg)}>
                                <card.icon className={cn("h-6 w-6", card.color)} />
                            </div>
                            <div className={cn(
                                "flex items-center gap-1 text-sm font-medium",
                                card.isPositive ? "text-emerald-500" : "text-amber-500"
                            )}>
                                {card.isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                {card.trend}
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{card.title}</p>
                            <h3 className="text-3xl font-bold mt-1 text-white tabular-nums">{card.value}</h3>
                        </div>
                        {/* Glow effect */}
                        <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-primary/5 blur-3xl rounded-full transition-opacity group-hover:opacity-100 opacity-0" />
                    </div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <div className="lg:col-span-4 space-y-6">
                    {isManager && <ApprovalsWidget />}
                    {!isManager && (
                        <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
                            <Activity className="h-12 w-12 text-primary/20 mb-4" />
                            <p className="text-muted-foreground text-center max-w-xs">
                                Valuation trends and category analysis charts are available in the <span className="text-primary font-semibold">Reports</span> section.
                            </p>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-3 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm p-6 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Live Activity
                        </h3>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary animate-pulse">LIVE</span>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {(Array.isArray(stats?.recent_transactions) ? stats!.recent_transactions : []).map((tx: any, idx: number) => (
                            <div
                                key={idx}
                                className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                            >
                                <div className={cn(
                                    "mt-1 h-2 w-2 rounded-full shrink-0",
                                    tx.txn_type?.includes('in') ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                )} />
                                <div className="space-y-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {tx.txn_type?.replace('_', ' ').toUpperCase()}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change} units
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/50">
                                        {new Date(tx.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Calendar, TrendingUp, Package, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAnalytics, fetchDashboardSummary } from '@/api/services';
import { cn } from '@/lib/utils';

export function ReportsPage() {
    const {
        data: analytics,
        isLoading: analyticsLoading,
        isError: analyticsError,
        refetch: refetchAnalytics
    } = useQuery({
        queryKey: ['analytics'],
        queryFn: fetchAnalytics,
    });

    const {
        data: summary,
        isLoading: summaryLoading,
        refetch: refetchSummary
    } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: fetchDashboardSummary,
    });

    const isLoading = analyticsLoading || summaryLoading;

    const refreshData = () => {
        refetchAnalytics();
        refetchSummary();
    };

    if (analyticsError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-destructive/20 bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Failed to load analytics data</h2>
                <Button variant="outline" onClick={refreshData}>Try Again</Button>
            </div>
        );
    }

    const valuationData = analytics?.valuation_trend || [];
    const movementData = analytics?.stock_movement || [];

    const totalValue = summary?.total_inventory_value || 0;
    const lowStockCount = summary?.low_stock_alerts?.length || 0;

    const formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(totalValue));

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary drop-shadow-[0_0_8px_rgba(0,184,217,0.5)]">Reports & Analytics</h1>
                    <p className="text-muted-foreground mt-1">
                        Visualize inventory valuation, turnover, and historical trends.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:border-primary/50 hover:bg-primary/10 text-primary transition-all duration-300 backdrop-blur-md"
                        onClick={refreshData}
                    >
                        <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button>Export CSV</Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Inventory Value"
                    value={isLoading ? null : formattedValue}
                    icon={DollarSign}
                    iconClassName="text-blue-500"
                />
                <StatCard
                    title="Est. Profit Margin"
                    value="41.2%"
                    icon={TrendingUp}
                    iconClassName="text-emerald-500"
                />
                <StatCard
                    title="Low Stock SKUs"
                    value={isLoading ? null : lowStockCount}
                    icon={Package}
                    iconClassName="text-amber-500"
                    isAlert={lowStockCount > 0}
                />
                <StatCard
                    title="Stock Turnover Rate"
                    value="4.8x"
                    icon={Calendar}
                    iconClassName="text-purple-500"
                />
            </div>

            {/* Main Charts Area */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Area Chart: Valuation Trend */}
                <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur-xl text-card-foreground shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-6 group">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Inventory Valuation Trend
                    </h3>
                    <div className="h-[300px] w-full">
                        {isLoading ? (
                            <div className="w-full h-full animate-pulse bg-white/5 rounded-lg" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={valuationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="month" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Area type="monotone" name="Retail Value" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                                    <Area type="monotone" name="Cost Basis" dataKey="cost" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Bar Chart: Stock Movement by Category */}
                <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur-xl text-card-foreground shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-6 group">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Stock Movement by Category (30d)
                    </h3>
                    <div className="h-[300px] w-full">
                        {isLoading ? (
                            <div className="w-full h-full animate-pulse bg-white/5 rounded-lg" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={movementData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar name="Units Received (In)" dataKey="in" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar name="Units Sold/Transferred (Out)" dataKey="out" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: string | number | null;
    icon: React.ElementType;
    iconClassName?: string;
    isAlert?: boolean;
}

function StatCard({ title, value, icon: Icon, iconClassName, isAlert }: StatCardProps) {
    return (
        <div className={cn(
            "rounded-xl border border-white/5 bg-black/40 backdrop-blur-xl text-card-foreground shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-6 flex items-center space-x-4 transition-all hover:bg-black/60 group",
            isAlert ? "hover:shadow-[0_8px_30px_rgba(245,158,11,0.2)] hover:border-amber-500/30" : "hover:shadow-[0_8px_30px_rgba(0,184,217,0.2)] hover:border-primary/30"
        )}>
            <div className={cn(
                "p-3 rounded-full transition-all group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]",
                iconClassName?.replace('text-', 'bg-') + '/10'
            )}>
                <Icon className={cn("h-6 w-6", iconClassName)} />
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-primary/80 transition-colors">{title}</p>
                {value === null ? (
                    <div className="h-8 w-24 animate-pulse bg-white/5 rounded-md mt-1" />
                ) : (
                    <h3 className={cn(
                        "text-2xl font-bold tracking-tight group-hover:text-white transition-colors",
                        isAlert && "text-amber-500"
                    )}>{value}</h3>
                )}
            </div>
        </div>
    );
}

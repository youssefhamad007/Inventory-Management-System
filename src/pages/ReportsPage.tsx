import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Calendar, TrendingUp, Package, DollarSign, Activity, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalytics } from '@/api/dashboard';
import { cn } from '@/lib/utils';

interface AnalyticsData {
    valuation_trend: any[];
    stock_movement: any[];
}

export function ReportsPage() {
    const { data: analytics, isLoading } = useQuery<AnalyticsData>({
        queryKey: ['analytics'],
        queryFn: () => fetchAnalytics()
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Activity className="h-12 w-12 animate-spin text-primary/40" />
            </div>
        );
    }

    const currentValuation = (analytics?.valuation_trend?.length ?? 0) > 0
        ? analytics!.valuation_trend[analytics!.valuation_trend.length - 1]?.value || 0
        : 0;
    const previousValuation = analytics?.valuation_trend?.[0]?.value || 1;
    const growth = ((currentValuation - previousValuation) / previousValuation * 100).toFixed(1);

    return (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,184,217,0.4)]">Intelligence Center</h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Historical valuation trends and categorical turnover metrics.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button variant="outline" className="bg-black/40 border-white/10 group">
                        <Calendar className="mr-2 h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                        <span>Fixed 30-Day Window</span>
                    </Button>
                    <Button className="shadow-[0_0_15px_rgba(0,184,217,0.3)]">
                        <FileDown className="mr-2 h-4 w-4" /> Export Report
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Current Valuation', value: `$${currentValuation.toLocaleString()}`, icon: DollarSign, color: 'text-blue-400', trend: `+${growth}%` },
                    { label: 'Asset Appreciation', value: '41.2%', icon: TrendingUp, color: 'text-emerald-400', trend: 'STABLE' },
                    { label: 'Turnover Velocity', value: '4.8x', icon: Activity, color: 'text-purple-400', trend: '+0.2x' },
                    { label: 'Replenishment Risk', value: 'Low', icon: Package, color: 'text-amber-400', trend: 'OPTIMAL' },
                ].map((kpi, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/5 bg-black/40 p-6 shadow-2xl hover:border-primary/30 transition-all group">
                        <div className="flex items-start justify-between">
                            <div className="p-2 rounded-lg bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                                <kpi.icon className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold text-primary/60 tracking-tighter uppercase">{kpi.trend}</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase">{kpi.label}</p>
                            <h3 className={cn("text-2xl font-bold mt-1 tracking-tight", kpi.color)}>{kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Area */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Area Chart: Valuation Trend */}
                <div className="rounded-2xl border border-white/5 bg-black/40 p-6 shadow-2xl relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        30-Day Valuation Pulse
                    </h3>
                    <div className="h-[350px] w-full relative z-10 overflow-hidden rounded-xl border border-white/5 bg-black/20 min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={350}>
                            <AreaChart data={analytics?.valuation_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                />
                                <Area type="monotone" name="Total Value" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart: Stock Movement */}
                <div className="rounded-2xl border border-white/5 bg-black/40 p-6 shadow-2xl relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                        <Package className="h-5 w-5 text-emerald-500" />
                        Categorical Volume Split
                    </h3>
                    <div className="h-[350px] w-full relative z-10 overflow-hidden rounded-xl border border-white/5 bg-black/20 min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={350}>
                            <BarChart data={analytics?.stock_movement}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                                <Bar name="Units In" dataKey="in" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar name="Units Out" dataKey="out" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

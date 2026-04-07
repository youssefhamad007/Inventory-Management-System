import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Check, X, Box } from 'lucide-react';
import { fetchApprovals, approveAdjustment, rejectAdjustment, type PendingApproval } from '@/api/approvals';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ApprovalsWidget() {
    const queryClient = useQueryClient();

    const { data: approvals, isLoading } = useQuery<PendingApproval[]>({
        queryKey: ['approvals'],
        queryFn: () => fetchApprovals(),
    });

    const approveMutation = useMutation({
        mutationFn: approveAdjustment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            toast.success('Adjustment Approved', { description: 'Stock updated.' });
        },
        onError: () => toast.error('Failed to approve')
    });

    const rejectMutation = useMutation({
        mutationFn: rejectAdjustment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            toast.success('Adjustment Rejected');
        },
        onError: () => toast.error('Failed to reject')
    });

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm p-6 flex items-center justify-center min-h-[300px]">
                <ShieldAlert className="animate-pulse text-amber-500/50 h-8 w-8" />
            </div>
        );
    }

    const unhandled = approvals || [];

    return (
        <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm flex flex-col h-[400px] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Manager Approvals</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Pending high-value stock adjustments</p>
                    </div>
                </div>
                {unhandled.length > 0 && (
                    <div className="bg-amber-500/20 text-amber-500 px-2.5 py-1 rounded-full text-xs font-bold">
                        {unhandled.length} Action{unhandled.length !== 1 ? 's' : ''} Needed
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {unhandled.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground pb-8">
                        <Box className="h-12 w-12 text-white/5 mb-4" />
                        <p>No pending approvals.</p>
                    </div>
                ) : (
                    unhandled.map((approval) => (
                        <div key={approval.id} className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 group hover:border-amber-500/30 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        {approval.product?.name || 'Unknown Product'}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-mono">
                                        {approval.product?.sku} &bull; {approval.branch?.name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-amber-400">
                                        {approval.quantity_change > 0 ? '+' : ''}{approval.quantity_change}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase">{approval.txn_type}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                <span className="text-xs text-muted-foreground">
                                    Requested by <span className="text-white/80 font-medium">{approval.requester?.full_name || 'Staff'}</span>
                                </span>
                                <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs"
                                        onClick={() => rejectMutation.mutate(approval.id)}
                                        disabled={rejectMutation.isPending || approveMutation.isPending}
                                    >
                                        <X className="h-3 w-3 mr-1" /> Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-7 px-2 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black font-bold text-xs border border-transparent hover:border-emerald-500"
                                        onClick={() => approveMutation.mutate(approval.id)}
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                    >
                                        <Check className="h-3 w-3 mr-1" /> Approve
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

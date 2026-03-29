import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, MapPin, Phone, Calendar, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchBranches, deleteBranch } from '@/api/branches';
import { useProfile } from '@/hooks/useProfile';
import { CreateBranchModal } from '@/components/CreateBranchModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function BranchesPage() {
    const queryClient = useQueryClient();
    const { data: profile, isLoading: isProfileLoading } = useProfile();
    // Default to admin-view while loading to prevent flicker for owners
    const isAdmin = isProfileLoading || profile?.role === 'admin';
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

    const { data: branches, isLoading } = useQuery({
        queryKey: ['branches'],
        queryFn: () => fetchBranches(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteBranch(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            toast.success('Branch deactivated');
        },
        onError: () => toast.error('Failed to deactivate branch')
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to deactivate this branch?')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><Building2 className="animate-pulse text-primary h-12 w-12" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,184,217,0.4)]">Network Branches</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Manage your distributed inventory locations.</p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="shadow-[0_0_20px_rgba(0,184,217,0.3)] hover:shadow-[0_0_30px_rgba(0,184,217,0.5)] transition-all"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Branch
                    </Button>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {(branches ?? []).map((branch: any) => (
                    <div
                        key={branch.id}
                        className="group relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 shadow-2xl transition-all hover:border-primary/40 hover:bg-black/60"
                    >
                        {/* Header info */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-all">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded",
                                branch.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                            )}>
                                {branch.is_active ? 'ACTIVE' : 'OFFLINE'}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{branch.name}</h3>

                        <div className="space-y-3 mt-6">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 text-primary/60 shrink-0" />
                                <span className="truncate">{branch.address}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4 text-primary/60 shrink-0" />
                                <span>{branch.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground border-t border-white/5 pt-3 mt-3">
                                <Calendar className="h-4 w-4 text-primary/30 shrink-0" />
                                <span className="text-[10px]">Registry: {new Date(branch.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Admin Action Bar */}
                        {isAdmin && (
                            <div className="mt-6 flex gap-2 border-t border-white/5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="flex-1 text-xs hover:bg-primary/10 hover:text-primary">
                                    <Edit2 className="h-3 w-3 mr-2" /> Modify
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 text-xs hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleDelete(branch.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 className="h-3 w-3 mr-2" /> Deactivate
                                </Button>
                            </div>
                        )}

                        {/* Visual accent */}
                        <div className="absolute right-0 top-0 h-1 w-0 bg-primary group-hover:w-full transition-all duration-500" />
                    </div>
                ))}
            </div>

            <CreateBranchModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
}

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Shield, Building2, Trash2, Mail, Search } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { fetchUsers, deleteUser } from '@/api/users';
import { toast } from 'sonner';
import { InviteUserModal } from '@/components/InviteUserModal';

export function UsersPage() {
    const queryClient = useQueryClient();
    const [isInviteOpen, setIsInviteOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => fetchUsers(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('User access revoked');
        },
        onError: () => toast.error('Failed to revoke access')
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to revoke access for this user? This cannot be undone.')) {
            deleteMutation.mutate(id);
        }
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'full_name',
            header: 'Identity',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {row.original.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <div className="font-semibold">{row.original.full_name || 'Anonymous'}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-2 w-2" /> {row.original.id.slice(0, 8)}...
                        </div>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'role',
            header: 'Role',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Shield className={cn(
                        "h-4 w-4",
                        row.original.role === 'admin' ? "text-purple-500" : row.original.role === 'manager' ? "text-blue-500" : "text-emerald-500"
                    )} />
                    <span className="capitalize text-sm font-medium">{row.original.role}</span>
                </div>
            )
        },
        {
            accessorKey: 'branches.name',
            header: 'Assigned Location',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-muted-foreground italic">
                    <Building2 className="h-3 w-3" />
                    {row.original.branches?.name || 'GLOBAL (HQ)'}
                </div>
            )
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex justify-end pr-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    const filteredUsers = React.useMemo(() => {
        if (!users) return [];
        return users.filter((u: any) =>
            u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.role?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,184,217,0.4)]">Team Access</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Manage role-based permissions and branch assignments.</p>
                </div>
                <Button
                    onClick={() => setIsInviteOpen(true)}
                    className="shadow-[0_0_20px_rgba(0,184,217,0.3)] hover:shadow-[0_0_30px_rgba(0,184,217,0.5)] transition-all"
                >
                    <UserPlus className="mr-2 h-4 w-4" /> Create Member
                </Button>
            </div>

            <div className="flex flex-col bg-muted/20 backdrop-blur-md border border-white/5 rounded-xl shadow-lg p-6 relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="mb-6 flex items-center relative z-10 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search team members..."
                        className="pl-10 bg-black/40 border-white/10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 min-h-0 relative z-10">
                    <DataTable
                        columns={columns}
                        data={filteredUsers}
                        isLoading={isLoading}
                        pageCount={1}
                        pagination={{ pageIndex: 0, pageSize: 20 }}
                        onPaginationChange={() => { }}
                        sorting={[]}
                        onSortingChange={() => { }}
                    />
                </div>
            </div>

            <InviteUserModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
            />
        </div>
    );
}

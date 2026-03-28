import { Bell, User, Settings, Building, LogOut, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function Header() {
    const { logout } = useAuth();
    const { data: profile } = useProfile();

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await apiClient.get('notifications');
            return res.data;
        },
        refetchInterval: 60000
    });

    const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-black/20 px-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center flex-1">
                <div className="text-xs font-mono text-primary/40 tracking-[0.2em] uppercase hidden md:block">
                    Operational Matrix / {profile?.role || 'Guest'}
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {/* Notifications Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative group text-muted-foreground mr-2 hover:bg-white/5 hover:text-foreground transition-all">
                            <Bell className="h-5 w-5 transition-transform group-hover:scale-110 drop-shadow-[0_0_5px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-primary ring-2 ring-black shadow-[0_0_8px_rgba(0,184,217,0.8)] animate-pulse" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0 bg-black/90 border-white/10 backdrop-blur-xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <span className="text-sm font-semibold">Notifications</span>
                            <span className="text-xs text-primary cursor-pointer hover:underline">Mark all as read</span>
                        </div>
                        <div className="flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                            {notifications?.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground text-sm italic">
                                    Systems nominal. No pending alerts.
                                </div>
                            )}
                            {notifications?.map((alert: any) => (
                                <div key={alert.id} className="flex items-start gap-3 p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0">
                                    <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                                        <Package className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none text-white">{alert.title || 'System Alert'}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                                        <p className="text-[10px] text-muted-foreground/50">{new Date(alert.created_at).toLocaleTimeString()}</p>
                                    </div>
                                    {!alert.is_read && <div className="h-2 w-2 mt-1.5 rounded-full bg-primary" />}
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary/80 to-emerald-500/80 flex items-center justify-center text-black font-bold text-xs cursor-pointer select-none ring-2 ring-transparent transition-all hover:ring-primary/50 hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(0,184,217,0.3)]">
                            {profile?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 bg-black/95 border-white/10 backdrop-blur-2xl" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-bold leading-none text-white">{profile?.full_name || 'Identifying...'}</p>
                                <p className="text-[10px] font-mono leading-none text-primary/60 uppercase tracking-widest">{profile?.role || 'Guest'}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Security Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Branch Assignment</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem
                            onClick={() => logout()}
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Terminate Session</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </header>
    );
}

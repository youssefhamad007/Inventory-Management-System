import { Bell, User, Settings, Building, LogOut, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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

export function Header() {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();

    const displayName = profile?.full_name || user?.email || 'User';
    const displayEmail = user?.email || '';
    const displayRole = profile?.role || 'user';

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-black/20 px-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center flex-1">
                {profile && (
                    <span className="text-xs text-muted-foreground capitalize bg-muted/30 px-2 py-1 rounded-md">
                        {displayRole}
                    </span>
                )}
            </div>

            <div className="flex items-center space-x-4">

                {/* Notifications Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative group text-muted-foreground mr-2 hover:bg-white/5 hover:text-foreground transition-all">
                            <Bell className="h-5 w-5 transition-transform group-hover:scale-110 drop-shadow-[0_0_5px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-primary ring-2 ring-black shadow-[0_0_8px_rgba(0,184,217,0.8)] animate-pulse" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <span className="text-sm font-semibold">Notifications</span>
                            <span className="text-xs text-muted-foreground cursor-pointer hover:underline">Mark all as read</span>
                        </div>
                        <div className="flex flex-col max-h-[300px] overflow-y-auto">
                            <div className="flex items-start gap-3 p-4 text-center text-muted-foreground text-sm">
                                <p className="w-full">No new notifications</p>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white cursor-pointer select-none ring-2 ring-transparent transition-all hover:ring-indigo-500/50 hover:scale-105 active:scale-95">
                            <User className="h-4 w-4" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Profile Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <Building className="mr-2 h-4 w-4" />
                                <span>Branch Preferences</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </header>
    );
}

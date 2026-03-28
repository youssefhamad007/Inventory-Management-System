import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '@/components/CommandPalette';
import { Toaster } from 'sonner';

export function Layout() {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            {/* Notifications Hook */}
            {/* <useRealtimeNotifications /> - will be instantiated where auth is present */}

            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="mx-auto max-w-7xl w-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            <CommandPalette />
            <Toaster position="bottom-right" theme="system" />
        </div>
    );
}

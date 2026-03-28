import * as React from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Box, Home, Package, ShoppingCart, Search, Terminal, Zap, X } from 'lucide-react';

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in">
            <div className="w-full max-w-[640px] rounded-2xl border border-white/10 bg-[#0A0A0B]/95 text-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden relative ring-1 ring-white/5">
                <Command
                    label="Nexus Strategic Command"
                    className="flex h-full w-full flex-col"
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setOpen(false);
                    }}
                >
                    <div className="flex items-center border-b border-white/5 px-4 h-14">
                        <Search className="mr-3 h-5 w-5 text-primary animate-pulse" />
                        <Command.Input
                            autoFocus
                            placeholder="Initialize tactical query..."
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/40 font-mono tracking-tight"
                        />
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded-md hover:bg-white/5 text-muted-foreground transition-all"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">
                        <Command.Empty className="py-12 text-center">
                            <Terminal className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
                            <p className="text-sm text-muted-foreground">Command sequence not recognized.</p>
                        </Command.Empty>

                        <Command.Group
                            heading="Navigation Matrix"
                            className="px-2 text-[10px] uppercase tracking-[0.2em] font-bold text-primary/50 mb-2 mt-2"
                        >
                            <div className="mt-2 space-y-1">
                                <NavItem icon={Home} label="Dashboard Central" onSelect={() => runCommand(() => navigate('/'))} />
                                <NavItem icon={Package} label="Resource Registry (Products)" onSelect={() => runCommand(() => navigate('/products'))} />
                                <NavItem icon={Box} label="Operational Stock" onSelect={() => runCommand(() => navigate('/stock'))} />
                                <NavItem icon={ShoppingCart} label="Logistic Manifests (Orders)" onSelect={() => runCommand(() => navigate('/orders'))} />
                            </div>
                        </Command.Group>

                        <Command.Group
                            heading="Tactical Actions"
                            className="px-2 text-[10px] uppercase tracking-[0.2em] font-bold text-amber-500/50 mb-2 mt-6 border-t border-white/5 pt-4"
                        >
                            <div className="mt-2 space-y-1">
                                <ActionItem
                                    icon={Zap}
                                    label="Instant Stock Adjustment"
                                    shortcut="A"
                                    onSelect={() => runCommand(() => navigate('/stock'))}
                                />
                                <ActionItem
                                    icon={Plus}
                                    label="Initiate New Order"
                                    shortcut="N"
                                    onSelect={() => runCommand(() => navigate('/orders'))}
                                />
                            </div>
                        </Command.Group>
                    </Command.List>

                    <div className="flex items-center justify-between px-4 h-10 border-t border-white/5 bg-white/[0.02] text-[10px] font-mono text-muted-foreground">
                        <div className="flex items-center space-x-4">
                            <span><kbd className="rounded bg-white/10 px-1 text-white">↑↓</kbd> Navigate</span>
                            <span><kbd className="rounded bg-white/10 px-1 text-white">↵</kbd> Execute</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <span className="text-primary/40 italic">Nexus Core v1.0</span>
                        </div>
                    </div>
                </Command>
            </div>
        </div>
    );
}

function NavItem({ icon: Icon, label, onSelect }: any) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary transition-all group"
        >
            <div className="mr-3 h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center group-aria-selected:bg-primary group-aria-selected:text-black transition-all">
                <Icon className="h-4 w-4" />
            </div>
            <span className="font-medium tracking-wide">{label}</span>
        </Command.Item>
    );
}

function ActionItem({ icon: Icon, label, shortcut, onSelect }: any) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex cursor-pointer select-none items-center justify-between rounded-xl px-3 py-3 text-sm outline-none aria-selected:bg-amber-500/10 aria-selected:text-amber-500 transition-all group"
        >
            <div className="flex items-center">
                <div className="mr-3 h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center group-aria-selected:bg-amber-500 group-aria-selected:text-black transition-all">
                    <Icon className="h-4 w-4" />
                </div>
                <span className="font-medium tracking-wide">{label}</span>
            </div>
            {shortcut && (
                <kbd className="hidden sm:inline-block rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] text-muted-foreground group-aria-selected:border-amber-500/30 group-aria-selected:text-amber-500">
                    {shortcut}
                </kbd>
            )}
        </Command.Item>
    );
}

function Plus(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}

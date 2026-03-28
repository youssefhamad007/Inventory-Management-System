import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function LoginPage() {
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await login(formData.email, formData.password);
        if (error) {
            toast.error('Tactical Error', {
                description: error || 'Authorization refused by the matrix.'
            });
            setLoading(false);
        } else {
            toast.success('Access Granted', {
                description: 'Welcome back to the operational theater.'
            });
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0A0A0B]">
            {/* Background Grid & Particles */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#primary/5] via-transparent to-transparent" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 w-full max-w-md px-6"
            >
                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 p-[2px] shadow-[0_0_30px_rgba(0,184,217,0.4)]"
                    >
                        <div className="h-full w-full rounded-[14px] bg-[#0A0A0B] flex items-center justify-center">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                    </motion.div>
                    <h1 className="mt-6 text-3xl font-black tracking-tighter text-white uppercase italic">
                        Nexus <span className="text-primary tracking-normal not-italic font-extrabold text-2xl">IMS</span>
                    </h1>
                    <p className="mt-2 text-xs font-mono text-muted-foreground uppercase tracking-[0.3em]">Operational Interface v1.0</p>
                </div>

                <div className="group relative rounded-3xl border border-white/5 bg-black/40 p-8 backdrop-blur-3xl shadow-2xl transition-all hover:border-primary/20">
                    {/* Corner accents */}
                    <div className="absolute -top-[1px] -left-[1px] h-4 w-4 border-t-2 border-l-2 border-primary/40 rounded-tl-xl" />
                    <div className="absolute -bottom-[1px] -right-[1px] h-4 w-4 border-b-2 border-r-2 border-primary/40 rounded-br-xl" />

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Personnel Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                                <Input
                                    type="email"
                                    placeholder="agent@nexus.ops"
                                    className="pl-10 h-12 bg-white/5 border-white/5 focus:border-primary/30 transition-all font-medium"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Authentication Bypass</Label>
                                <button type="button" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Forgot Code?</button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 h-12 bg-white/5 border-white/5 focus:border-primary/30 transition-all font-medium"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest hover:bg-primary/90 shadow-[0_0_20px_rgba(0,184,217,0.3)] transition-all group"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center">
                                        Authorize Session <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-8 flex items-center justify-center space-x-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span>Secure Terminal Connection Active</span>
                    </div>
                </div>

                <div className="mt-10 flex justify-center space-x-8 text-[10px] font-mono text-muted-foreground/40 text-center uppercase">
                    <div className="flex flex-col">
                        <span className="text-white/60">Endpoint</span>
                        <span>Vercel Ops-1</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white/60">Latency</span>
                        <span className="text-primary italic">14ms</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white/60">Status</span>
                        <span className="text-emerald-500">Active</span>
                    </div>
                </div>
            </motion.div>

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-1/4 -right-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
        </div>
    );
}

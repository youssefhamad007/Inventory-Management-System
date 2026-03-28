import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Shield, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'staff',
        password: '' // Temporary pass since we don't have true magic links yet
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiClient.post('/api/v1/users/create', formData);
            toast.success('Personnel Authorized', {
                description: `${formData.full_name} has been added to the IMS database.`
            });
            onClose();
            setFormData({ email: '', full_name: '', role: 'staff', password: '' });
        } catch (err) {
            toast.error('Authentication Error', {
                description: 'Failed to provision new user identity.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-black/95 border-white/10 backdrop-blur-2xl text-white">
                <DialogHeader>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight">Authorize Personnel</DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">Provision new credentials for the operational matrix.</p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-indigo-400/70">Full Identifier</Label>
                            <Input
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="bg-white/5 border-white/5 focus:border-indigo-500/50"
                                placeholder="Rick Deckard"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-indigo-400/70">Secure Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="pl-10 bg-white/5 border-white/5 focus:border-indigo-500/50"
                                    placeholder="deckard@nexus.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-indigo-400/70">Initial Bypass Code</Label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="bg-white/5 border-white/5 focus:border-indigo-500/50"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-indigo-400/70">Clearance Level</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(v) => setFormData({ ...formData, role: v })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/5 focus:border-indigo-500/50">
                                    <div className="flex items-center">
                                        <Shield className="mr-2 h-4 w-4 text-indigo-400" />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-black/95 border-white/10">
                                    <SelectItem value="admin">Level 3 (Admin)</SelectItem>
                                    <SelectItem value="manager">Level 2 (Manager)</SelectItem>
                                    <SelectItem value="staff">Level 1 (Staff)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/5">
                            Abort
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                        >
                            {loading ? 'Provisioning...' : 'Confirm Authorization'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

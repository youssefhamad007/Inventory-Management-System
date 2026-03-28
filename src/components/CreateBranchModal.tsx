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
import { Building2, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBranch } from '@/api/branches';

interface CreateBranchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateBranchModal({ isOpen, onClose }: CreateBranchModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: ''
    });

    const mutation = useMutation({
        mutationFn: createBranch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            toast.success('Expansion Succesful', {
                description: `${formData.name} is now online in the operational matrix.`
            });
            onClose();
            setFormData({ name: '', address: '', phone: '' });
        },
        onError: () => {
            toast.error('Tactical Failure', {
                description: 'Could not initialize new branch coordinates.'
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-black/95 border-white/10 backdrop-blur-2xl text-white">
                <DialogHeader>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight">Expand Network</DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">Initialize new regional operational center.</p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs uppercase tracking-widest text-primary/70">Branch Name</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="pl-10 bg-white/5 border-white/5 focus:border-primary/50 transition-all"
                                    placeholder="Warehouse Gamma"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-xs uppercase tracking-widest text-primary/70">Strategic Address</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="pl-10 bg-white/5 border-white/5 focus:border-primary/50 transition-all"
                                    placeholder="123 Sector Nine, High City"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs uppercase tracking-widest text-primary/70">Comms Link (Phone)</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="pl-10 bg-white/5 border-white/5 focus:border-primary/50 transition-all"
                                    placeholder="+1 (555) 000-GAMMA"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/5">
                            Abort
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                            className="bg-primary text-black font-bold hover:bg-primary/90 shadow-[0_0_15px_rgba(0,184,217,0.4)]"
                        >
                            {mutation.isPending ? 'Initializing...' : 'Confirm Activation'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

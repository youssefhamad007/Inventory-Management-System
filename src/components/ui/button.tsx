import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
    {
        variants: {
            variant: {
                default: 'bg-primary text-black shadow-[0_0_15px_rgba(0,184,217,0.3)] hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(0,184,217,0.5)] border-none',
                destructive: 'bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30',
                outline: 'border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20',
                secondary: 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500 hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]',
                ghost: 'text-muted-foreground hover:bg-white/5 hover:text-white',
                link: 'text-primary underline-offset-4 hover:underline',
                glow: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(0,184,217,0.4)]',
            },
            size: {
                default: 'h-10 px-6 py-2',
                sm: 'h-8 rounded-md px-3 text-[10px]',
                lg: 'h-12 rounded-xl px-10 text-base',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

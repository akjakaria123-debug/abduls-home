import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// 600-weight gradient stops, not 500: white label text measures 4.47:1
// and 3.46:1 against the lighter pair, both short of 4.5:1.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-900/30 hover:brightness-110 focus-visible:outline-indigo-400',
  secondary: 'bg-white text-[#070A1A] hover:bg-slate-200 focus-visible:outline-indigo-400',
  outline:
    'border border-white/15 bg-white/5 text-white hover:bg-white/10 focus-visible:outline-indigo-400',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white focus-visible:outline-indigo-400',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';

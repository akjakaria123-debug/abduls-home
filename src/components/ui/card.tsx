import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Glass over the dark ground: a hairline border and a barely-there fill
// are what separate one panel from the next without drawing boxes.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-white/5 px-5 py-4', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

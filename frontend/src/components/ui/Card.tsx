import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glass?: boolean;
}

export function Card({ className, children, glass, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6',
        glass ? 'glass border-[var(--border)]' : 'bg-[var(--card)] border-[var(--border)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

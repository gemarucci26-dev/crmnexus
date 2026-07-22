import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-xl border bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none transition-all focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20',
              icon && 'pl-10',
              error && 'border-red-500',
              className
            )}
            style={{ borderColor: error ? undefined : 'var(--border)' }}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

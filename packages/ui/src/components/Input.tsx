import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean;
}

export function Input({ className, invalid = false, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900 transition-colors',
        'focus:ring-brand-500 placeholder:text-slate-400 focus:outline-none focus:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
        invalid ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700',
        className,
      )}
      {...props}
    />
  );
}

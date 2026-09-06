import { cn } from '../lib/cn';

export interface SpinnerProps {
  readonly className?: string;
  readonly label?: string;
}

export function Spinner({ className, label = 'Carregando' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}

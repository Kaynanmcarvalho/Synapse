import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes condicionais e resolve conflitos do Tailwind
 *  (a ultima utilitaria do mesmo grupo vence). */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

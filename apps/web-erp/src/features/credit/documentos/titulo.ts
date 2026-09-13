import type { DetalheDoTitulo } from '@synapse/types';

/** Situacao frente ao vencimento, em palavras. */
export const prazoDoTitulo = (titulo: DetalheDoTitulo): string => {
  const dias = titulo.diasParaVencer;
  if (dias === null) return '—';
  if (dias === 0) return 'Vence hoje';
  if (dias > 0) return `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return `${-dias} ${dias === -1 ? 'dia' : 'dias'} em atraso`;
};

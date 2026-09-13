/** Utilitarios de texto e data das regras de credito. Datas sao AAAA-MM-DD e a
 *  conta e feita em UTC de proposito: somar dias a uma data de calendario nao
 *  pode depender do fuso de quem roda o codigo. */

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const moeda = (centavos: number): string => MOEDA.format(centavos / 100);

export const semAcento = (valor: string): string =>
  valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export const plural = (quantidade: number, singular: string, varios: string): string =>
  `${quantidade} ${quantidade === 1 ? singular : varios}`;

const DIA_EM_MS = 86_400_000;

/** '2026-09-13T15:00:00Z' ou '2026-09-13' viram '2026-09-13'. */
export const soData = (iso: string): string => iso.slice(0, 10);

export const somarDias = (dataIso: string, dias: number): string =>
  new Date(Date.parse(`${soData(dataIso)}T00:00:00.000Z`) + dias * DIA_EM_MS)
    .toISOString()
    .slice(0, 10);

/** Dias de `de` ate `ate`, contando so o calendario. */
export const diasEntre = (de: string, ate: string): number =>
  Math.round(
    (Date.parse(`${soData(ate)}T00:00:00.000Z`) - Date.parse(`${soData(de)}T00:00:00.000Z`)) /
      DIA_EM_MS,
  );

/** Um decimal, sem ruido de ponto flutuante: 81.99999 vira 82. */
export const umaCasa = (valor: number): number => Math.round(valor * 10) / 10;

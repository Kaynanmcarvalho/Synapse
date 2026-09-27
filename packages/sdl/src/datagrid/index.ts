/** Fundação de DataGrid (Fase 5) — implementa a Data Row v1 já congelada
 *  (`README.md#data-row`), não cria linguagem visual nova. Cobre o caso
 *  comum de linha/célula/cabeçalho; capacidades avançadas (resize, reorder,
 *  visibilidade de coluna, seleção múltipla) continuam vivendo em quem as
 *  usa hoje (a fila de crédito) até terem uma segunda referência real. */
export * from './tipos';
export { proximaOrdenacao, useOrdenacaoLocal } from './ordenacao';
export { classesDaLinha, type OpcoesDaLinha } from './estados';
export { SynapseSignal, type SynapseSignalProps, type GatilhoDoSignal } from './linha';
export { DataGridCelula, type DataGridCelulaProps } from './celula';
export { DataGridCabecalho, type DataGridCabecalhoProps } from './cabecalho';

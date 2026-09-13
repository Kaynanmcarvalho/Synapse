import { item, montarMenu, SEPARADOR as SEP, submenu } from '../menu.utils';

/** Rotinas Fiscais. Os submenus ainda esperam captura de tela do Syndata. */
export const ROTINAS_FISCAIS = montarMenu('Rotinas Fiscais', [
  // [inferido]
  submenu('L.M.C', [item('Lançamento do LMC'), item('Livro de Movimentação de Combustíveis')]),
  SEP,
  item('Geração do arquivo Sintegra'),
  SEP,
  // [inferido]
  submenu('SPED - Sistema Público de Escrituração Digital', [
    item('EFD ICMS/IPI'),
    item('EFD Contribuições'),
  ]),
  SEP,
  item('Emissor CT-e / MDF-e', { feature: 'MDFE' }),
  item('Envio de XML para Contabilidade'),
]);

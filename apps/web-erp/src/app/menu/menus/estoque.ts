import { item, montarMenu, SEPARADOR as SEP, submenu } from '../menu.utils';

/** Estoque, na ordem do Syndata. Submenus conferidos nos prints, menos os
 *  marcados com [inferido]. */
export const ESTOQUE = montarMenu('Estoque', [
  item('Lançamento de Nota Fiscal de Entrada', { para: '/compras' }),
  item('Estorno de Entrada de Nota Fiscal'),
  item('Controle de Notas Fiscais Emitidas para meu CNPJ', {
    para: '/estoque/entradas-xml',
    feature: 'DFE',
  }),
  SEP,
  item('Emissão de Nota Fiscal (Devolução / Remessa / Transferência / ...)', { feature: 'NFE' }),
  item('Emissão de Nota Fiscal de Importação', { feature: 'NFE' }),
  item('Emissão de Nota Fiscal Complementar', { feature: 'NFE' }),
  item('Cancelamento de Nota Fiscal Emitida', { feature: 'NFE' }),
  SEP,
  submenu('Troca de Mercadorias', [
    item('Controle de Troca de Mercadorias'),
    item('Nova Troca de Mercadorias'),
  ]),
  item('Transferência de Estoque'),
  item('Controle de Produtos em Consignação'),
  item('Balanço de Estoque', { para: '/estoque/inventarios', feature: 'INVENTORY' }),
  // [inferido]
  submenu('Balanço de Estoque/Contagens', [
    item('Contagens em Andamento', { para: '/estoque/inventarios', feature: 'INVENTORY' }),
    item('Importar Contagem do Coletor'),
  ]),
  SEP,
  // [inferido]
  submenu('Gestão de Projetos', [item('Projetos'), item('Apontamento de Materiais')]),
  item('Desmembramento de Produtos'),
  SEP,
  item('Consulta Movimentação de Produtos', { para: '/estoque', feature: 'INVENTORY' }),
  SEP,
  submenu('Relatórios', [
    item('Posição de estoque'),
    item('Posição de Venda / Estoque'),
    item('Produtos com Estoque Mínimo'),
    item('Curva ABC de Fornecedores'),
    item('Relatório Produtos por NCM'),
    SEP,
    item('Markup de Produtos'),
    item('Lista de Preços'),
    SEP,
    item('Transferência de Estoque'),
    SEP,
    item('Balanço de Estoque'),
    item('Registro de Inventário'),
    item('Gestão de Projetos'),
    SEP,
    item('Espelho Nota Fiscal de Entrada'),
    SEP,
    item('Notas Fiscais de Entrada'),
    item('Notas Fiscais Totalizadas por CFOP'),
  ]),
]);

import { item, montarMenu, SEPARADOR as SEP, submenu } from '../menu.utils';

/** Vendas, na ordem do Syndata. Ctrl+N (Venda Balcao) virou Alt+N: navegador
 *  nenhum entrega Ctrl+N para a pagina — ele sempre abre uma janela nova. Os
 *  demais atalhos sao os mesmos. */
export const VENDAS = montarMenu('Vendas', [
  item('Venda Balcão', { atalho: 'Alt+N' }),
  item('Venda PDV Balcão', { atalho: 'Ctrl+O' }),
  item('Venda PDV NFC-e', { para: '/vendas/pdv', atalho: 'Ctrl+D', feature: 'NFCE' }),
  item('Venda Tablet'),
  item('Negociação de Desconto'),
  item('Consulta Preço'),
  SEP,
  item('Venda Posto'),
  submenu('Restaurante', [
    item('Consumo Mesa'),
    item('Venda Restaurante'),
    item('Venda Touch'),
    item('Controle de Entrega de Comanda'),
    item('Autoatendimento'),
  ]),
  item('Venda Conveniada'),
  submenu('Proposta de Venda', [
    item('Controle de Proposta de Venda'),
    item('Proposta de Venda'),
    item('Cancelamento de Proposta'),
  ]),
  // [inferido]
  submenu('Ordem de Serviços', [
    item('Controle de Ordens de Serviço'),
    item('Nova Ordem de Serviço'),
  ]),
  SEP,
  // Unica troca proposital em relacao ao Syndata: no lugar do "Caixa Balcao"
  // fica a Analise de Credito, onde caem os pedidos que os vendedores enviam.
  item('Análise de Crédito', { para: '/vendas/analise-de-credito', atalho: 'Ctrl+I' }),
  SEP,
  item('Impressão de Documento Avulso'),
  SEP,
  item('Cancelamento de Venda', { atalho: 'Ctrl+L' }),
  SEP,
  submenu('Remessa de Entrega', [
    item('Controle de Entrega'),
    SEP,
    item('Controle Remessa Entrega de Mercadoria'),
    item('Nova Remessa Entrega de Mercadoria'),
    SEP,
    item('Controle de Remessa de Cargas'),
  ]),
  SEP,
  item('Consulta de Pedidos'),
  item('Controle de Pedidos Multiloja'),
  item('Consulta Produtos', { atalho: 'Ctrl+F8' }),
  item('Histórico de Vendas'),
  SEP,
  item('Controle de Comissão'),
  SEP,
  submenu('Relatórios', [
    item('Vendas'),
    item('Vendas Restaurante'),
    item('Curva ABC de Produtos e Serviços', { para: '/estoque/inteligencia' }),
    item('Curva ABC de Clientes'),
    item('Curva ABC de Marcas'),
    SEP,
    item('Gerenciador de Comissão de Vendas'),
    item('Comissão de Vendas'),
    item('Comissão Assessor de Venda'),
    SEP,
    item('Ordem de Serviços'),
    SEP,
    item('Remessa de Entrega'),
    item('Remessa Entrega de Mercadorias'),
    item('Remessa de Carga'),
    item('Notas Fiscais Emitidas'),
    item('Docs. Fiscais Emitidos por CST de PIS/COFINS'),
    item('Emissão de Recibo Avulso'),
  ]),
]);

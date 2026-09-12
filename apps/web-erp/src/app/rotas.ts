/** Caminhos das telas que existem. App.tsx monta as rotas a partir daqui e o
 *  teste do menu confere que nenhum item "disponivel" aponta para tela inexistente. */
export const ROTAS = {
  visaoGeral: '/visao-geral',
  estoque: '/estoque',
  inventarios: '/estoque/inventarios',
  entradasXml: '/estoque/entradas-xml',
  inteligenciaDeEstoque: '/estoque/inteligencia',
  compras: '/compras',
  boletos: '/financeiro/boletos',
  pdv: '/vendas/pdv',
  produtos: '/cadastros/produtos',
  cargos: '/configuracoes/cargos',
  filiais: '/configuracoes/filiais',
  integracoes: '/configuracoes/integracoes',
  fiscal: '/configuracoes/fiscal',
  historicoDeLogs: '/ferramentas/historico-de-logs',
} as const;

export const CAMINHOS_COM_TELA: readonly string[] = Object.values(ROTAS);

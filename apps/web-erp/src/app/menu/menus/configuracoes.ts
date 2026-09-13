import { item, montarMenu, SEPARADOR as SEP } from '../menu.utils';

/** Configuracoes. Todas as opcoes sao de primeiro nivel, como no Syndata. */
export const CONFIGURACOES = montarMenu('Configurações', [
  item('Mini Impressora'),
  SEP,
  item('TEF - Modo Administrativo'),
  item('TEF - Cancelamento'),
  SEP,
  item('Processar Lote Pendente'),
  item('Notas Fiscais Emitidas Em Contingência', { feature: 'NFE' }),
  item('Serviços de Nota Fiscal Eletrônica da SEFAZ', { feature: 'NFE' }),
  item('Controle de Notas Fiscais Eletrônicas de Produtos (NF-e)', { feature: 'NFE' }),
  item('Notas Fiscais Emitidas Em Duplicidade', { feature: 'NFE' }),
  item('Assistente de Configuração de NF-e', { para: '/configuracoes/fiscal', feature: 'NFE' }),
  SEP,
  item('Controle de Notas Fiscais Eletrônicas de Serviços (NFS-e)'),
  item('Configuração de NFS-e'),
  SEP,
  item('Exportar Tab. de Preços Balança Integrada'),
  item('Exportar Tab. de Preços para o Leitor de Consulta'),
  SEP,
  item('Sistema Unificado'),
  item('Sistema', { para: '/configuracoes/integracoes' }),
]);

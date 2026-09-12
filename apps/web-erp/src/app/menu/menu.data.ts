import type { MenuPrincipal } from './menu.types';
import { item, montarMenu, SEPARADOR as SEP, submenu } from './menu.utils';

/** A barra de menus do Syndata, na mesma ordem e com as mesmas opcoes — quem
 *  migra encontra cada rotina onde ja estava acostumado a procurar.
 *
 *  Item com `para` abre uma tela que ja existe no Synapse. Item sem `para` leva
 *  a /modulo/<id>, que mostra onde a opcao mora e que ela ainda vem.
 *
 *  Os prints do Syndata mostram so o primeiro nivel: o conteudo dos submenus
 *  (itens com seta) foi inferido e esta marcado com [inferido] abaixo.
 *
 *  Ctrl+N (Venda Balcao) virou Alt+N: navegador nenhum entrega Ctrl+N para a
 *  pagina — ele sempre abre uma janela nova. Os demais atalhos sao os mesmos. */
export const MENUS: readonly MenuPrincipal[] = [
  montarMenu('Cadastros', [
    // [inferido]
    submenu('Parâmetros da Empresa', [
      item('Dados da Empresa'),
      item('Configuração por Filial', { para: '/configuracoes/filiais' }),
      item('Parâmetros Gerais'),
    ]),
    SEP,
    // [inferido]
    submenu('Financeiro', [
      item('Plano de Contas'),
      item('Contas Bancárias'),
      item('Formas de Pagamento'),
      item('Condições de Pagamento'),
      item('Centros de Custo'),
    ]),
    // [inferido]
    submenu('Fiscais', [
      item('Tributação e CFOP'),
      item('NCM'),
      item('Natureza de Operação'),
      item('Certificado Digital'),
    ]),
    SEP,
    item('Transportadoras'),
    item('Praças e Regiões'),
    item('Assessores de Venda'),
    item('Mesas / Cartões'),
    SEP,
    // [inferido]
    submenu('Clientes', [
      item('Cadastro de Clientes'),
      item('Grupos de Clientes'),
      item('Crédito e Limite'),
    ]),
    // [inferido]
    submenu('Fornecedores', [item('Cadastro de Fornecedores'), item('Grupos de Fornecedores')]),
    // [inferido]
    submenu('Funcionários', [item('Cadastro de Funcionários'), item('Vendedores e Comissões')]),
    // [inferido]
    submenu('Produtos / Serviços', [
      item('Cadastro de Produtos', { para: '/cadastros/produtos' }),
      item('Grupos e Subgrupos'),
      item('Marcas'),
      item('Unidades de Medida'),
      item('Tabelas de Preço'),
    ]),
    SEP,
    // [inferido]
    submenu('Relatórios', [
      item('Relação de Clientes'),
      item('Relação de Fornecedores'),
      item('Relação de Produtos'),
    ]),
  ]),

  montarMenu('Vendas', [
    item('Venda Balcão', { atalho: 'Alt+N' }),
    item('Venda PDV Balcão', { atalho: 'Ctrl+O' }),
    item('Venda PDV NFC-e', { para: '/vendas/pdv', atalho: 'Ctrl+D', feature: 'NFCE' }),
    item('Venda Tablet'),
    item('Negociação de Desconto'),
    item('Consulta Preço'),
    SEP,
    item('Venda Posto'),
    SEP,
    submenu('Restaurante', [item('Mesas e Comandas'), item('Delivery'), item('Cardápio')]), // [inferido]
    SEP,
    item('Venda Conveniada'),
    SEP,
    submenu('Proposta de Venda', [item('Nova Proposta'), item('Consultar Propostas')]), // [inferido]
    SEP,
    submenu('Ordem de Serviços', [
      item('Nova Ordem de Serviço'),
      item('Consultar Ordens de Serviço'),
    ]), // [inferido]
    SEP,
    item('Caixa Balcão', { para: '/vendas/pdv', atalho: 'Ctrl+I' }),
    SEP,
    item('Impressão de Documento Avulso'),
    SEP,
    item('Cancelamento de Venda', { atalho: 'Ctrl+L' }),
    SEP,
    submenu('Remessa de Entrega', [item('Nova Remessa'), item('Acompanhar Entregas')]), // [inferido]
    SEP,
    item('Consulta de Pedidos'),
    item('Controle de Pedidos Multiloja'),
    item('Consulta Produtos', { atalho: 'Ctrl+F8' }),
    item('Histórico de Vendas'),
    SEP,
    item('Controle de Comissão'),
    SEP,
    // [inferido]
    submenu('Relatórios', [
      item('Vendas por Período'),
      item('Vendas por Vendedor'),
      item('Vendas por Produto'),
    ]),
  ]),

  montarMenu('Estoque', [
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
    submenu('Troca de Mercadorias', [item('Nova Troca'), item('Consultar Trocas')]), // [inferido]
    item('Transferência de Estoque'),
    item('Controle de Produtos em Consignação'),
    item('Balanço de Estoque', { para: '/estoque/inventarios', feature: 'INVENTORY' }),
    // [inferido]
    submenu('Balanço de Estoque/Contagens', [
      item('Contagens em Andamento', { para: '/estoque/inventarios', feature: 'INVENTORY' }),
      item('Importar Contagem do Coletor'),
    ]),
    SEP,
    submenu('Gestão de Projetos', [item('Projetos'), item('Apontamento de Materiais')]), // [inferido]
    item('Desmembramento de Produtos'),
    SEP,
    item('Consulta Movimentação de Produtos', { para: '/estoque', feature: 'INVENTORY' }),
    SEP,
    // [inferido]
    submenu('Relatórios', [
      item('Curva ABC e Giro de Estoque', { para: '/estoque/inteligencia' }),
      item('Produtos com Estoque Negativo'),
      item('Inventário Valorizado'),
    ]),
  ]),

  montarMenu('Financeiro', [
    // [inferido]
    submenu('Contas a Pagar', [
      item('Lançar Conta a Pagar'),
      item('Baixar Contas a Pagar'),
      item('Consultar Contas a Pagar'),
    ]),
    // [inferido]
    submenu('Contas a Receber', [
      item('Lançar Conta a Receber'),
      item('Baixar Contas a Receber'),
      item('Boletos', { para: '/financeiro/boletos', feature: 'BANKS' }),
      item('Consultar Contas a Receber'),
    ]),
    item('Crédito do Cliente'),
    item('Controle de Recibos Emitidos'),
    SEP,
    // [inferido]
    submenu('Controle de Contas (Caixa e Bancos)', [
      item('Movimentação de Caixa'),
      item('Contas Bancárias'),
      item('Conciliação Bancária', { feature: 'BANKS' }),
    ]),
    item('Registrar Sangria / Suprimentos', { para: '/vendas/pdv' }),
    item('Fluxo de Caixa'),
    SEP,
    item('Emissão do Plano de Contas'),
    item('Livro Caixa'),
    SEP,
    // [inferido]
    submenu('Relatórios', [
      item('Contas a Pagar por Período'),
      item('Contas a Receber por Período'),
      item('Inadimplência'),
    ]),
  ]),

  montarMenu('Produtividade', [
    submenu('Agendamentos', [item('Agenda'), item('Novo Agendamento')]), // [inferido]
    SEP,
    item('Checklist'),
    item('Mala Direta por Email'),
    item('Mensagem por WhatsApp'),
    item('Plano Fidelidade'),
    item('Lista de Presentes'),
    item('Controle de Cardápio / Catálogo Virtual'),
    SEP,
    submenu('Relatórios', [item('Clientes do Plano Fidelidade'), item('Mensagens Enviadas')]), // [inferido]
  ]),

  montarMenu('Rotinas Fiscais', [
    submenu('L.M.C', [item('Lançamento do LMC'), item('Livro de Movimentação de Combustíveis')]), // [inferido]
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
  ]),

  montarMenu('Configurações', [
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
  ]),

  montarMenu('Ferramentas', [
    item('Manutenção de Usuários', { para: '/configuracoes/cargos' }),
    SEP,
    item('Gerar Carga Inicial para o PDV Offline'),
    item('Painel Sincronizador PDV Offline'),
    SEP,
    item('Histórico de Logs', { para: '/ferramentas/historico-de-logs' }),
    SEP,
    item('Autenticar Licença de Uso'),
    SEP,
    item('Boas Vindas'),
    item('Informativo'),
    item('Atualizar Notificações'),
    SEP,
    item('Autenticação de Usuário', { atalho: 'Ctrl+F12' }),
    SEP,
    item('Calculadora'),
    item('Controle de Impressoras'),
    SEP,
    item('Sobre', { atalho: 'Ctrl+F1' }),
  ]),

  montarMenu('Suporte', [
    item('Nós Ligamos para Você!'),
    item('Chat Online'),
    item('Boleto de Manutenção Disponível'),
    SEP,
    item('AnyDesk'),
    item('RustDesk'),
    SEP,
    submenu('Cópia de Segurança (Backup)', [item('Fazer Backup Agora'), item('Restaurar Backup')]), // [inferido]
    SEP,
    item('Instalador Certificado Digital'),
    SEP,
    item('Consultar Disponibilidade SEFAZ'),
    SEP,
    item('Verificar Atualização do Sistema'),
    item('Notas da Versão'),
    item('Dados de Instalação'),
  ]),
];

import { CAMINHOS_COM_TELA } from '../rotas';
import { MENUS } from './menu.data';
import type { EntradaDeMenu } from './menu.types';
import {
  atalhoCorresponde,
  encontrarPorCaminho,
  filtrarPorFeature,
  item,
  lerAtalho,
  montarMenu,
  proximoIndice,
  SEPARADOR,
  slug,
  submenu,
  todosOsItens,
} from './menu.utils';

const rotulosDoPrimeiroNivel = (rotulo: string) =>
  MENUS.find((menu) => menu.rotulo === rotulo)
    ?.itens.filter((e) => e.tipo !== 'separador')
    .map((e) => ('rotulo' in e ? e.rotulo : ''));

const idsDe = (entradas: readonly EntradaDeMenu[]): string[] =>
  entradas.flatMap((e) => [e.id, ...(e.tipo === 'submenu' ? idsDe(e.itens) : [])]);

// A razao de existir deste menu: quem vem do Syndata acha tudo onde ja procurava.
describe('fidelidade ao menu do Syndata', () => {
  it('tem os mesmos menus, na mesma ordem', () => {
    expect(MENUS.map((menu) => menu.rotulo)).toEqual([
      'Cadastros',
      'Vendas',
      'Estoque',
      'Financeiro',
      'Produtividade',
      'Rotinas Fiscais',
      'Configurações',
      'Ferramentas',
      'Suporte',
    ]);
  });

  it.each([
    [
      'Cadastros',
      [
        'Parâmetros da Empresa',
        'Financeiro',
        'Fiscais',
        'Transportadoras',
        'Praças e Regiões',
        'Assessores de Venda',
        'Mesas / Cartões',
        'Clientes',
        'Fornecedores',
        'Funcionários',
        'Produtos / Serviços',
        'Relatórios',
      ],
    ],
    [
      'Vendas',
      [
        'Venda Balcão',
        'Venda PDV Balcão',
        'Venda PDV NFC-e',
        'Venda Tablet',
        'Negociação de Desconto',
        'Consulta Preço',
        'Venda Posto',
        'Restaurante',
        'Venda Conveniada',
        'Proposta de Venda',
        'Ordem de Serviços',
        'Caixa Balcão',
        'Impressão de Documento Avulso',
        'Cancelamento de Venda',
        'Remessa de Entrega',
        'Consulta de Pedidos',
        'Controle de Pedidos Multiloja',
        'Consulta Produtos',
        'Histórico de Vendas',
        'Controle de Comissão',
        'Relatórios',
      ],
    ],
    [
      'Estoque',
      [
        'Lançamento de Nota Fiscal de Entrada',
        'Estorno de Entrada de Nota Fiscal',
        'Controle de Notas Fiscais Emitidas para meu CNPJ',
        'Emissão de Nota Fiscal (Devolução / Remessa / Transferência / ...)',
        'Emissão de Nota Fiscal de Importação',
        'Emissão de Nota Fiscal Complementar',
        'Cancelamento de Nota Fiscal Emitida',
        'Troca de Mercadorias',
        'Transferência de Estoque',
        'Controle de Produtos em Consignação',
        'Balanço de Estoque',
        'Balanço de Estoque/Contagens',
        'Gestão de Projetos',
        'Desmembramento de Produtos',
        'Consulta Movimentação de Produtos',
        'Relatórios',
      ],
    ],
    [
      'Financeiro',
      [
        'Contas a Pagar',
        'Contas a Receber',
        'Crédito do Cliente',
        'Controle de Recibos Emitidos',
        'Controle de Contas (Caixa e Bancos)',
        'Registrar Sangria / Suprimentos',
        'Fluxo de Caixa',
        'Emissão do Plano de Contas',
        'Livro Caixa',
        'Relatórios',
      ],
    ],
    [
      'Produtividade',
      [
        'Agendamentos',
        'Checklist',
        'Mala Direta por Email',
        'Mensagem por WhatsApp',
        'Plano Fidelidade',
        'Lista de Presentes',
        'Controle de Cardápio / Catálogo Virtual',
        'Relatórios',
      ],
    ],
    [
      'Rotinas Fiscais',
      [
        'L.M.C',
        'Geração do arquivo Sintegra',
        'SPED - Sistema Público de Escrituração Digital',
        'Emissor CT-e / MDF-e',
        'Envio de XML para Contabilidade',
      ],
    ],
    [
      'Configurações',
      [
        'Mini Impressora',
        'TEF - Modo Administrativo',
        'TEF - Cancelamento',
        'Processar Lote Pendente',
        'Notas Fiscais Emitidas Em Contingência',
        'Serviços de Nota Fiscal Eletrônica da SEFAZ',
        'Controle de Notas Fiscais Eletrônicas de Produtos (NF-e)',
        'Notas Fiscais Emitidas Em Duplicidade',
        'Assistente de Configuração de NF-e',
        'Controle de Notas Fiscais Eletrônicas de Serviços (NFS-e)',
        'Configuração de NFS-e',
        'Exportar Tab. de Preços Balança Integrada',
        'Exportar Tab. de Preços para o Leitor de Consulta',
        'Sistema Unificado',
        'Sistema',
      ],
    ],
    [
      'Ferramentas',
      [
        'Manutenção de Usuários',
        'Gerar Carga Inicial para o PDV Offline',
        'Painel Sincronizador PDV Offline',
        'Histórico de Logs',
        'Autenticar Licença de Uso',
        'Boas Vindas',
        'Informativo',
        'Atualizar Notificações',
        'Autenticação de Usuário',
        'Calculadora',
        'Controle de Impressoras',
        'Sobre',
      ],
    ],
    [
      'Suporte',
      [
        'Nós Ligamos para Você!',
        'Chat Online',
        'Boleto de Manutenção Disponível',
        'AnyDesk',
        'RustDesk',
        'Cópia de Segurança (Backup)',
        'Instalador Certificado Digital',
        'Consultar Disponibilidade SEFAZ',
        'Verificar Atualização do Sistema',
        'Notas da Versão',
        'Dados de Instalação',
      ],
    ],
  ])('%s tem as mesmas opcoes do Syndata', (menu, esperados) => {
    expect(rotulosDoPrimeiroNivel(menu)).toEqual(esperados);
  });

  it('mantem os atalhos do Syndata que o navegador deixa a pagina usar', () => {
    const atalhos = Object.fromEntries(
      todosOsItens(MENUS)
        .filter((i) => i.atalho)
        .map((i) => [i.rotulo, i.atalho?.rotulo]),
    );
    expect(atalhos).toEqual({
      'Venda Balcão': 'Alt+N',
      'Venda PDV Balcão': 'Ctrl+O',
      'Venda PDV NFC-e': 'Ctrl+D',
      'Caixa Balcão': 'Ctrl+I',
      'Cancelamento de Venda': 'Ctrl+L',
      'Consulta Produtos': 'Ctrl+F8',
      'Autenticação de Usuário': 'Ctrl+F12',
      Sobre: 'Ctrl+F1',
    });
  });
});

describe('integridade do menu', () => {
  it('nao repete id', () => {
    const ids = MENUS.flatMap((menu) => idsDe(menu.itens));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo item disponivel abre uma tela que existe', () => {
    const quebrados = todosOsItens(MENUS)
      .filter((i) => i.situacao === 'disponivel' && !CAMINHOS_COM_TELA.includes(i.caminho))
      .map((i) => `${i.trilha.join(' > ')} -> ${i.caminho}`);
    expect(quebrados).toEqual([]);
  });

  it('todo item em breve tem caminho proprio e e encontravel por ele', () => {
    const emBreve = todosOsItens(MENUS).filter((i) => i.situacao === 'em-breve');
    expect(new Set(emBreve.map((i) => i.caminho)).size).toBe(emBreve.length);
    for (const i of emBreve) expect(encontrarPorCaminho(MENUS, i.caminho)?.id).toBe(i.id);
  });

  // Estas o navegador consome antes da pagina: um atalho assim nunca funcionaria.
  it('nao usa atalho reservado pelo navegador', () => {
    const reservados = ['ctrl+n', 'ctrl+t', 'ctrl+w', 'ctrl+shift+n', 'ctrl+tab'];
    const usados = todosOsItens(MENUS).flatMap((i) =>
      i.atalho ? [i.atalho.rotulo.toLowerCase()] : [],
    );
    expect(usados.filter((a) => reservados.includes(a))).toEqual([]);
    expect(new Set(usados).size).toBe(usados.length);
  });
});

describe('utilitarios do menu', () => {
  it('slug tira acento e pontuacao', () => {
    expect(slug('Controle de Notas Fiscais Eletrônicas (NF-e)')).toBe(
      'controle-de-notas-fiscais-eletronicas-nf-e',
    );
  });

  it('lerAtalho separa modificadores e tecla', () => {
    expect(lerAtalho('Ctrl+F8')).toEqual({
      tecla: 'F8',
      ctrl: true,
      alt: false,
      shift: false,
      rotulo: 'Ctrl+F8',
    });
  });

  it('atalhoCorresponde aceita Cmd no Mac e exige os mesmos modificadores', () => {
    const atalho = lerAtalho('Ctrl+D');
    const base = { key: 'd', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
    expect(atalhoCorresponde(atalho, { ...base, ctrlKey: true })).toBe(true);
    expect(atalhoCorresponde(atalho, { ...base, metaKey: true })).toBe(true);
    expect(atalhoCorresponde(atalho, { ...base, ctrlKey: true, shiftKey: true })).toBe(false);
    expect(atalhoCorresponde(atalho, base)).toBe(false);
  });

  it('item sem tela ganha rota generica e trilha completa', () => {
    const [menu] = [montarMenu('Vendas', [submenu('Restaurante', [item('Delivery')])])];
    const [folha] = todosOsItens([menu!]);
    expect(folha).toMatchObject({
      caminho: '/modulo/vendas/restaurante/delivery',
      situacao: 'em-breve',
      trilha: ['Vendas', 'Restaurante', 'Delivery'],
    });
  });

  it('filtrarPorFeature tira item, submenu vazio e separador que sobrou', () => {
    const menu = montarMenu('Estoque', [
      item('A'),
      SEPARADOR,
      item('Fiscal', { feature: 'NFE' }),
      SEPARADOR,
      submenu('So fiscal', [item('B', { feature: 'NFE' })]),
      item('C'),
    ]);
    const [filtrado] = filtrarPorFeature([menu], (f) => f !== 'NFE');
    expect(filtrado?.itens.map((e) => (e.tipo === 'separador' ? '---' : e.rotulo))).toEqual([
      'A',
      '---',
      'C',
    ]);
  });

  it('proximoIndice pula separador e da a volta', () => {
    const { itens } = montarMenu('X', [item('A'), SEPARADOR, item('B')]);
    expect(proximoIndice(itens, 0, 1)).toBe(2);
    expect(proximoIndice(itens, 2, 1)).toBe(0);
    expect(proximoIndice(itens, 0, -1)).toBe(2);
  });
});

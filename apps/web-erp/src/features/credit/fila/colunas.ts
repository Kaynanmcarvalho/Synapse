import type { PedidoNaFila } from '@synapse/types';
import { ROTULO_DA_ORIGEM, ROTULO_DO_TIPO } from '../analise';

/** As colunas da fila: o que cada uma mostra, como se ordena e quanto ocupa.
 *  Fica fora do componente porque e regra — a ordem que o usuario escolheu, o
 *  criterio de cada coluna — e regra se testa. */

export type IdDaColuna =
  | 'pedido'
  | 'cliente'
  | 'tipo'
  | 'documento'
  | 'cidade'
  | 'bairro'
  | 'formaDePagamento'
  | 'condicao'
  | 'prazo'
  | 'representante'
  | 'origem'
  | 'itens'
  | 'enviadoEm'
  | 'situacao'
  | 'valor';

export type Direcao = 'asc' | 'desc';

export interface Ordenacao {
  readonly coluna: IdDaColuna;
  readonly direcao: Direcao;
}

export interface Coluna {
  readonly id: IdDaColuna;
  readonly rotulo: string;
  /** O que dois cliques fazem nesta coluna, dito em palavras. */
  readonly criterio: string;
  readonly alinhamento: 'esquerda' | 'direita';
  readonly larguraMinima: number;
  readonly valor: (linha: PedidoNaFila) => string | number;
}

const texto = (valor: string | null): string => valor ?? '';

export const COLUNAS: Record<IdDaColuna, Coluna> = {
  pedido: {
    id: 'pedido',
    rotulo: 'Pedido',
    criterio: 'do mais antigo ao mais novo',
    alinhamento: 'esquerda',
    larguraMinima: 88,
    valor: (linha) => linha.pedido.numero,
  },
  cliente: {
    id: 'cliente',
    rotulo: 'Cliente',
    criterio: 'de A a Z',
    alinhamento: 'esquerda',
    larguraMinima: 200,
    valor: (linha) => linha.pedido.clienteNome,
  },
  tipo: {
    id: 'tipo',
    rotulo: 'Tipo',
    criterio: 'de A a Z',
    alinhamento: 'esquerda',
    larguraMinima: 130,
    valor: (linha) => ROTULO_DO_TIPO[linha.pedido.tipo],
  },
  documento: {
    id: 'documento',
    rotulo: 'CNPJ / CPF',
    criterio: 'em ordem numérica',
    alinhamento: 'esquerda',
    larguraMinima: 150,
    valor: (linha) => texto(linha.pedido.clienteDocumento),
  },
  cidade: {
    id: 'cidade',
    rotulo: 'Cidade',
    criterio: 'de A a Z',
    alinhamento: 'esquerda',
    larguraMinima: 150,
    valor: (linha) => texto(linha.pedido.clienteCidade),
  },
  bairro: {
    id: 'bairro',
    rotulo: 'Bairro',
    criterio: 'de A a Z',
    alinhamento: 'esquerda',
    larguraMinima: 150,
    valor: (linha) => texto(linha.pedido.clienteBairro),
  },
  formaDePagamento: {
    id: 'formaDePagamento',
    rotulo: 'Forma de pagamento',
    criterio: 'de A a Z',
    alinhamento: 'esquerda',
    larguraMinima: 150,
    valor: (linha) => linha.pedido.formaDePagamento,
  },
  condicao: {
    id: 'condicao',
    rotulo: 'Condição',
    criterio: 'de A a Z',
    alinhamento: 'esquerda',
    larguraMinima: 150,
    valor: (linha) => linha.pedido.condicaoDePagamento,
  },
  prazo: {
    id: 'prazo',
    rotulo: 'Prazo',
    criterio: 'do menor prazo ao maior',
    alinhamento: 'direita',
    larguraMinima: 90,
    valor: (linha) => linha.pedido.prazoMedioEmDias,
  },
  representante: {
    id: 'representante',
    rotulo: 'Representante',
    criterio: 'de A a Z',
    alinhamento: 'esquerda',
    larguraMinima: 150,
    valor: (linha) => linha.pedido.vendedorNome,
  },
  origem: {
    id: 'origem',
    rotulo: 'Origem',
    criterio: 'de A a Z',
    alinhamento: 'esquerda',
    larguraMinima: 110,
    valor: (linha) => ROTULO_DA_ORIGEM[linha.pedido.origem],
  },
  itens: {
    id: 'itens',
    rotulo: 'Itens',
    criterio: 'do menor para o maior',
    alinhamento: 'direita',
    larguraMinima: 80,
    valor: (linha) => linha.pedido.itens.length,
  },
  enviadoEm: {
    id: 'enviadoEm',
    rotulo: 'Enviado em',
    criterio: 'do mais antigo ao mais recente',
    alinhamento: 'esquerda',
    larguraMinima: 150,
    valor: (linha) => linha.pedido.enviadoEm,
  },
  situacao: {
    id: 'situacao',
    rotulo: 'Situação do cliente',
    criterio: 'do menor atraso ao maior',
    alinhamento: 'direita',
    larguraMinima: 160,
    valor: (linha) => linha.cliente.diasDeAtrasoMaximo,
  },
  valor: {
    id: 'valor',
    rotulo: 'Valor',
    criterio: 'do menor para o maior',
    alinhamento: 'direita',
    larguraMinima: 130,
    valor: (linha) => linha.pedido.totalCentavos,
  },
};

export const TODAS_AS_COLUNAS: readonly IdDaColuna[] = [
  'pedido',
  'cliente',
  'tipo',
  'documento',
  'cidade',
  'bairro',
  'formaDePagamento',
  'condicao',
  'prazo',
  'representante',
  'origem',
  'itens',
  'enviadoEm',
  'situacao',
  'valor',
];

/** O que aparece antes de o usuario mexer: o essencial da analise, sem sufocar
 *  a janela. O resto fica no seletor de colunas. */
export const ORDEM_PADRAO: readonly IdDaColuna[] = [
  'pedido',
  'cliente',
  'tipo',
  'documento',
  'cidade',
  'bairro',
  'formaDePagamento',
  'representante',
  'prazo',
  'situacao',
  'valor',
];

export const ORDENACAO_PADRAO: Ordenacao = { coluna: 'enviadoEm', direcao: 'desc' };

const comparar = (coluna: Coluna, a: PedidoNaFila, b: PedidoNaFila): number => {
  const valorA = coluna.valor(a);
  const valorB = coluna.valor(b);
  if (typeof valorA === 'number' && typeof valorB === 'number') return valorA - valorB;
  // pt-BR com `numeric`: "Loja 2" vem antes de "Loja 10", e acento nao atrapalha.
  return String(valorA).localeCompare(String(valorB), 'pt-BR', {
    sensitivity: 'base',
    numeric: true,
  });
};

export const ordenarFila = (
  linhas: readonly PedidoNaFila[],
  ordenacao: Ordenacao,
): readonly PedidoNaFila[] => {
  const coluna = COLUNAS[ordenacao.coluna];
  const sinal = ordenacao.direcao === 'asc' ? 1 : -1;
  return [...linhas].sort(
    (a, b) => sinal * comparar(coluna, a, b) || a.pedido.numero - b.pedido.numero,
  );
};

/** Dois cliques na mesma coluna invertem; em outra coluna, comeca crescente —
 *  A-Z no texto, do menor para o maior no numero. */
export const proximaOrdenacao = (atual: Ordenacao, coluna: IdDaColuna): Ordenacao =>
  atual.coluna === coluna
    ? { coluna, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
    : { coluna, direcao: 'asc' };

/** Move uma coluna para a posicao de outra, que e o que o arrasto faz. */
export const moverColuna = (
  ordem: readonly IdDaColuna[],
  arrastada: IdDaColuna,
  alvo: IdDaColuna,
): readonly IdDaColuna[] => {
  if (arrastada === alvo) return ordem;
  const sem = ordem.filter((id) => id !== arrastada);
  const destino = sem.indexOf(alvo);
  if (destino < 0) return ordem;
  return [...sem.slice(0, destino), arrastada, ...sem.slice(destino)];
};

export const alternarColuna = (
  ordem: readonly IdDaColuna[],
  coluna: IdDaColuna,
): readonly IdDaColuna[] =>
  ordem.includes(coluna)
    ? ordem.filter((id) => id !== coluna)
    : // Entra de volta na posicao que tem no padrao, e nao no fim da tabela.
      TODAS_AS_COLUNAS.filter((id) => id === coluna || ordem.includes(id));

/** Busca livre: casa com qualquer coluna visivel, sem acento e sem caixa. */
const semAcento = (valor: string): string =>
  valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const filtrarFila = (
  linhas: readonly PedidoNaFila[],
  busca: string,
  colunas: readonly IdDaColuna[],
): readonly PedidoNaFila[] => {
  const termo = semAcento(busca.trim());
  if (!termo) return linhas;
  return linhas.filter((linha) =>
    colunas.some((id) => semAcento(String(COLUNAS[id].valor(linha))).includes(termo)),
  );
};

export type Atalho = 'todos' | 'com-atraso' | 'sem-titulo' | 'nao-venda' | 'hoje';

export const ATALHOS: ReadonlyArray<{ readonly id: Atalho; readonly rotulo: string }> = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'com-atraso', rotulo: 'Com atraso' },
  { id: 'sem-titulo', rotulo: 'Sem dívida' },
  { id: 'nao-venda', rotulo: 'Bonificação e troca' },
  { id: 'hoje', rotulo: 'Enviados hoje' },
];

/** Dia local de um instante ISO: `startsWith` no ISO cru erraria o dia depois
 *  das 21h no Brasil, quando em Greenwich ja e amanha. */
export const dataLocal = (iso: string): string => {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso.slice(0, 10);
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  const dia = `${data.getDate()}`.padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
};

export const aplicarAtalho = (
  linhas: readonly PedidoNaFila[],
  atalho: Atalho,
  hoje: string,
): readonly PedidoNaFila[] => {
  if (atalho === 'com-atraso') return linhas.filter((linha) => linha.cliente.titulosVencidos > 0);
  if (atalho === 'sem-titulo')
    return linhas.filter(
      (linha) => linha.cliente.vencidoCentavos + linha.cliente.aVencerCentavos === 0,
    );
  if (atalho === 'nao-venda') return linhas.filter((linha) => linha.pedido.tipo !== 'VENDA');
  if (atalho === 'hoje')
    return linhas.filter((linha) => dataLocal(linha.pedido.enviadoEm) === hoje);
  return linhas;
};

export interface TotaisDaFila {
  readonly pedidos: number;
  readonly valorCentavos: number;
  readonly vencidoCentavos: number;
  readonly clientes: number;
}

export const totaisDaFila = (linhas: readonly PedidoNaFila[]): TotaisDaFila => ({
  pedidos: linhas.length,
  valorCentavos: linhas.reduce((soma, linha) => soma + linha.pedido.totalCentavos, 0),
  // Divida vencida conta uma vez por cliente, e nao uma vez por pedido.
  vencidoCentavos: [
    ...new Map(linhas.map((linha) => [linha.pedido.customerId, linha.cliente])).values(),
  ].reduce((soma, cliente) => soma + cliente.vencidoCentavos, 0),
  clientes: new Set(linhas.map((linha) => linha.pedido.customerId)).size,
});

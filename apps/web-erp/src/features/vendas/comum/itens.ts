import type { Product } from '@synapse/types';

/** A linha da grade do Ponto de Vendas e do PDV. Quantidade em milésimos
 *  (1,5 kg = 1500) e dinheiro em centavos, como a API guarda. O preço é o da
 *  tabela; o que o balcão negocia para baixo vira desconto da linha. */
export interface LinhaDaVenda {
  readonly chave: string;
  readonly productId: string;
  readonly codigo: string;
  readonly descricao: string;
  readonly unidade: string;
  readonly pesoUnitarioKg: number | null;
  readonly categoriaId: string | null;
  readonly quantidade: number;
  readonly precoCentavos: number;
  readonly descontoCentavos: number;
  readonly lote: string | null;
  readonly serie: string | null;
}

export interface TotaisDaVenda {
  readonly itens: number;
  readonly volumes: number;
  readonly pesoKg: number;
  readonly brutoCentavos: number;
  readonly descontosCentavos: number;
  readonly liquidoCentavos: number;
}

let sequencia = 0;
const novaChave = () => {
  sequencia += 1;
  return `linha-${Date.now()}-${sequencia}`;
};

export const brutoDaLinha = (linha: Pick<LinhaDaVenda, 'quantidade' | 'precoCentavos'>): number =>
  Math.round((linha.quantidade * linha.precoCentavos) / 1000);

export const liquidoDaLinha = (linha: LinhaDaVenda): number =>
  Math.max(0, brutoDaLinha(linha) - linha.descontoCentavos);

export const totalizar = (linhas: readonly LinhaDaVenda[]): TotaisDaVenda => {
  const brutoCentavos = linhas.reduce((soma, linha) => soma + brutoDaLinha(linha), 0);
  const descontosCentavos = linhas.reduce((soma, linha) => soma + linha.descontoCentavos, 0);
  return {
    itens: linhas.length,
    volumes: linhas.reduce((soma, linha) => soma + linha.quantidade, 0) / 1000,
    pesoKg: Number(
      linhas
        .reduce((soma, linha) => soma + ((linha.pesoUnitarioKg ?? 0) * linha.quantidade) / 1000, 0)
        .toFixed(3),
    ),
    brutoCentavos,
    descontosCentavos,
    liquidoCentavos: brutoCentavos - descontosCentavos,
  };
};

/** "1,5" -> 1500; "2" -> 2000; "0,125" -> 125. Inválido ou zero: `null`. */
export const lerQuantidade = (texto: string): number | null => {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,3})?$/.test(limpo)) return null;
  const milesimos = Math.round(Number(limpo) * 1000);
  return milesimos > 0 ? milesimos : null;
};

/** 1500 -> "1,5"; 2000 -> "2"; 125 -> "0,125". */
export const escreverQuantidade = (milesimos: number): string =>
  (milesimos / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

/** O desconto que um preço digitado abaixo da tabela representa na linha. */
export const descontoDoPrecoDigitado = (
  quantidade: number,
  precoDeTabelaCentavos: number,
  precoDigitadoCentavos: number,
): number =>
  precoDigitadoCentavos >= precoDeTabelaCentavos
    ? 0
    : brutoDaLinha({ quantidade, precoCentavos: precoDeTabelaCentavos }) -
      brutoDaLinha({ quantidade, precoCentavos: precoDigitadoCentavos });

export const linhaDoProduto = (
  produto: Product,
  dados: {
    readonly quantidade: number;
    readonly precoCentavos: number;
    readonly descontoCentavos?: number;
    readonly lote?: string | null;
  },
): LinhaDaVenda => ({
  chave: novaChave(),
  productId: produto.id,
  codigo: produto.sku,
  descricao: produto.name,
  unidade: produto.logistics.unit,
  pesoUnitarioKg: produto.logistics.weightKg,
  categoriaId: produto.categoryId,
  quantidade: dados.quantidade,
  precoCentavos: dados.precoCentavos,
  descontoCentavos: Math.min(
    dados.descontoCentavos ?? 0,
    brutoDaLinha({ quantidade: dados.quantidade, precoCentavos: dados.precoCentavos }),
  ),
  lote: dados.lote ?? null,
  serie: null,
});

export const copiarLinha = (linha: LinhaDaVenda): LinhaDaVenda => ({
  ...linha,
  chave: novaChave(),
});

export type Desconto = { readonly tipo: 'percentual' | 'valor'; readonly valor: number };

/** Desconto numa linha: percentual sobre o bruto ou valor em centavos. */
export const descontarLinha = (linha: LinhaDaVenda, desconto: Desconto): LinhaDaVenda => {
  const bruto = brutoDaLinha(linha);
  const centavos =
    desconto.tipo === 'percentual' ? Math.round((bruto * desconto.valor) / 100) : desconto.valor;
  return { ...linha, descontoCentavos: Math.max(0, Math.min(bruto, centavos)) };
};

/** Desconto no documento inteiro: o percentual vale para cada linha; o valor é
 *  repartido pelo peso de cada linha no bruto, e o arredondamento cai na maior. */
export const descontarDocumento = (
  linhas: readonly LinhaDaVenda[],
  desconto: Desconto,
): LinhaDaVenda[] => {
  if (desconto.tipo === 'percentual') return linhas.map((linha) => descontarLinha(linha, desconto));
  const bruto = linhas.reduce((soma, linha) => soma + brutoDaLinha(linha), 0);
  if (bruto === 0) return [...linhas];
  const alvo = Math.min(bruto, Math.max(0, desconto.valor));
  const repartido = linhas.map((linha) => Math.floor((alvo * brutoDaLinha(linha)) / bruto));
  const sobra = alvo - repartido.reduce((soma, valor) => soma + valor, 0);
  const maior = linhas.reduce(
    (indice, linha, atual) =>
      brutoDaLinha(linha) > brutoDaLinha(linhas[indice] ?? linha) ? atual : indice,
    0,
  );
  return linhas.map((linha, indice) => ({
    ...linha,
    descontoCentavos: (repartido[indice] ?? 0) + (indice === maior ? sobra : 0),
  }));
};

export const percentualDeDesconto = (totais: TotaisDaVenda): number =>
  totais.brutoCentavos === 0 ? 0 : (totais.descontosCentavos / totais.brutoCentavos) * 100;

/** "3*7891000100103" -> quantidade "3" e o código; sem asterisco, só o código. */
export const separarMultiplicador = (
  texto: string,
): { readonly codigo: string; readonly quantidade: string | null } => {
  const achado = /^(\d+(?:,\d{1,3})?)\s*\*\s*(.+)$/.exec(texto.trim());
  return achado?.[1] && achado[2]
    ? { codigo: achado[2].trim(), quantidade: achado[1] }
    : { codigo: texto.trim(), quantidade: null };
};

export interface SimulacaoDeDesconto {
  readonly linhas: LinhaDaVenda[];
  readonly totais: TotaisDaVenda;
  readonly percentual: number;
  readonly invalido: boolean;
}

/** O que a janela Desc. mostra antes de aplicar: as linhas com o desconto, os
 *  totais, o percentual final e se o desconto passa do valor dos itens. */
export const simularDesconto = (
  linhas: readonly LinhaDaVenda[],
  linha: LinhaDaVenda | null,
  desconto: Desconto,
): SimulacaoDeDesconto => {
  const resultado = linha
    ? linhas.map((item) => (item.chave === linha.chave ? descontarLinha(item, desconto) : item))
    : descontarDocumento(linhas, desconto);
  const totais = totalizar(resultado);
  const bruto = linha ? brutoDaLinha(linha) : totalizar(linhas).brutoCentavos;
  return {
    linhas: resultado,
    totais,
    percentual: percentualDeDesconto(totais),
    invalido:
      desconto.tipo === 'percentual'
        ? desconto.valor < 0 || desconto.valor > 100
        : desconto.valor > bruto,
  };
};

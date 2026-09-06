import { BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

/** Leitura do XML de uma NF-e recebida (§17, §40).
 *
 *  O XML e a fonte da verdade da nota que o fornecedor emitiu: e o que a SEFAZ
 *  autorizou, e nao o que o pedido de compra dizia. Ler com parser, e nao com
 *  regex — a NF-e tem namespace, campo opcional e ordem que varia por emitente.
 *
 *  Valores monetarios viram centavos aqui: no XML eles vem como decimal em
 *  string, e continuar em ponto flutuante erraria centavos no custo medio. */

export interface EmitenteDaNota {
  readonly cnpj: string;
  readonly nome: string;
  readonly uf: string;
}

export interface ItemDaNota {
  /** Numero do item na nota, comecando em 1. */
  readonly numero: number;
  /** Codigo do produto no FORNECEDOR — nao e o nosso SKU. */
  readonly codigoDoFornecedor: string;
  readonly descricao: string;
  readonly ean: string | null;
  readonly ncm: string;
  readonly cfop: string;
  readonly unidade: string;
  /** Quantidade em milesimos, como no resto do sistema. */
  readonly quantidadeMilesimos: number;
  readonly valorUnitarioCentavos: number;
  readonly valorTotalCentavos: number;
  readonly lote: string | null;
  readonly validade: string | null;
}

export interface NotaRecebida {
  readonly chaveDeAcesso: string;
  readonly numero: string;
  readonly serie: string;
  readonly emissao: string;
  readonly emitente: EmitenteDaNota;
  readonly itens: readonly ItemDaNota[];
  readonly valorTotalCentavos: number;
  readonly duplicatas: readonly {
    readonly numero: string;
    readonly vencimento: string;
    readonly valorCentavos: number;
  }[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: true,
});

const comoTexto = (valor: unknown): string => {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number') return String(valor);
  return '';
};

/** Decimal do XML para centavos, sem passar por float.
 *
 *  `Math.round(Number('1234.565') * 100)` erra em alguns valores por causa da
 *  representacao binaria. Trabalhar nos digitos evita isso de vez. */
export const paraCentavos = (decimal: string): number => {
  const texto = comoTexto(decimal).trim();
  if (!texto) return 0;
  if (!/^-?\d+(\.\d+)?$/.test(texto)) {
    throw new BadRequestException(`Valor monetário inválido no XML: ${texto}`);
  }

  const negativo = texto.startsWith('-');
  const [inteira = '0', decimais = ''] = texto.replace('-', '').split('.');
  const centavos = `${decimais}00`.slice(0, 2);
  const terceiraCasa = Number(decimais[2] ?? '0');

  const total = Number(inteira) * 100 + Number(centavos) + (terceiraCasa >= 5 ? 1 : 0);
  return negativo ? -total : total;
};

/** Quantidade para milesimos, mesma logica. */
export const paraMilesimos = (decimal: string): number => {
  const texto = comoTexto(decimal).trim();
  if (!texto) return 0;
  if (!/^-?\d+(\.\d+)?$/.test(texto)) {
    throw new BadRequestException(`Quantidade inválida no XML: ${texto}`);
  }
  const [inteira = '0', decimais = ''] = texto.replace('-', '').split('.');
  const milesimos = `${decimais}000`.slice(0, 3);
  const total = Number(inteira) * 1000 + Number(milesimos);
  return texto.startsWith('-') ? -total : total;
};

const comoLista = (valor: unknown): Record<string, unknown>[] => {
  if (Array.isArray(valor)) return valor as Record<string, unknown>[];
  if (valor && typeof valor === 'object') return [valor as Record<string, unknown>];
  return [];
};

const objeto = (pai: unknown, chave: string): Record<string, unknown> => {
  const valor = (pai as Record<string, unknown> | undefined)?.[chave];
  return valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
};

/** Lote e validade ficam em rastro/rastreabilidade, que so existe em nota de
 *  produto que exige rastreio — racao e agro entram nesse caso. */
const rastro = (produto: Record<string, unknown>) => {
  const primeiro = comoLista(produto['rastro'])[0];
  if (!primeiro) return { lote: null, validade: null };
  return {
    lote: comoTexto(primeiro['nLote']) || null,
    validade: comoTexto(primeiro['dVal']) || null,
  };
};

const itemDe = (detalhe: Record<string, unknown>): ItemDaNota => {
  const produto = objeto(detalhe, 'prod');
  const { lote, validade } = rastro(produto);

  return {
    numero: Number(comoTexto(detalhe['@_nItem']) || '0'),
    codigoDoFornecedor: comoTexto(produto['cProd']),
    descricao: comoTexto(produto['xProd']),
    ean: (() => {
      const ean = comoTexto(produto['cEAN']);
      // "SEM GTIN" e o preenchimento oficial de quem nao tem codigo de barras.
      return ean && ean.toUpperCase() !== 'SEM GTIN' ? ean : null;
    })(),
    ncm: comoTexto(produto['NCM']),
    cfop: comoTexto(produto['CFOP']),
    unidade: comoTexto(produto['uCom']),
    quantidadeMilesimos: paraMilesimos(comoTexto(produto['qCom'])),
    valorUnitarioCentavos: paraCentavos(comoTexto(produto['vUnCom'])),
    valorTotalCentavos: paraCentavos(comoTexto(produto['vProd'])),
    lote,
    validade,
  };
};

export const lerNotaDoXml = (xml: string): NotaRecebida => {
  if (!xml.trim()) throw new BadRequestException('XML vazio');

  let raiz: Record<string, unknown>;
  try {
    raiz = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new BadRequestException('XML da NF-e não pôde ser lido');
  }

  // A nota vem solta ou dentro de nfeProc, conforme quem exportou o arquivo.
  const proc = objeto(raiz, 'nfeProc');
  const nfe = objeto(Object.keys(proc).length > 0 ? proc : raiz, 'NFe');
  const infNFe = objeto(nfe, 'infNFe');
  if (Object.keys(infNFe).length === 0) {
    throw new BadRequestException('XML não contém uma NF-e (infNFe ausente)');
  }

  const ide = objeto(infNFe, 'ide');
  const emit = objeto(infNFe, 'emit');
  const enderEmit = objeto(emit, 'enderEmit');
  const total = objeto(objeto(infNFe, 'total'), 'ICMSTot');
  const cobranca = objeto(infNFe, 'cobr');

  // A chave vem no atributo Id, prefixada com "NFe".
  const chave = comoTexto(infNFe['@_Id']).replace(/^NFe/i, '');
  if (!/^\d{44}$/.test(chave)) {
    throw new BadRequestException(`Chave de acesso inválida no XML: ${chave || '(ausente)'}`);
  }

  const itens = comoLista(infNFe['det']).map(itemDe);
  if (itens.length === 0) throw new BadRequestException('NF-e sem itens');

  return {
    chaveDeAcesso: chave,
    numero: comoTexto(ide['nNF']),
    serie: comoTexto(ide['serie']),
    emissao: comoTexto(ide['dhEmi']) || comoTexto(ide['dEmi']),
    emitente: {
      cnpj: comoTexto(emit['CNPJ']),
      nome: comoTexto(emit['xNome']),
      uf: comoTexto(enderEmit['UF']),
    },
    itens,
    valorTotalCentavos: paraCentavos(comoTexto(total['vNF'])),
    duplicatas: comoLista(cobranca['dup']).map((duplicata) => ({
      numero: comoTexto(duplicata['nDup']),
      vencimento: comoTexto(duplicata['dVenc']),
      valorCentavos: paraCentavos(comoTexto(duplicata['vDup'])),
    })),
  };
};

import type { UserId } from '@synapse/types';
import {
  concluirConferencia,
  itensPendentes,
  lancarNoEstoque,
  marcarItemConferido,
  prepararConferencia,
  validarManifestacao,
  type DeParaDoFornecedor,
} from './conferencia';
import { aplicarEntrada, parcelasDaNota } from './custo-medio';
import { lerNotaDoXml, paraCentavos, paraMilesimos } from './nfe-xml';

const CONFERENTE = 'uid-conferente' as UserId;
const AGORA = '2026-06-15T12:00:00.000Z';
const CHAVE = '52260612345678000199550010000012341234567890';

const xmlDaNota = (itens: string, dentroDeProc = true) => {
  const nfe = `<NFe><infNFe Id="NFe${CHAVE}" versao="4.00">
      <ide><nNF>1234</nNF><serie>1</serie><dhEmi>2026-06-10T09:00:00-03:00</dhEmi></ide>
      <emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Agro LTDA</xNome>
        <enderEmit><UF>GO</UF></enderEmit></emit>
      ${itens}
      <total><ICMSTot><vNF>1500.00</vNF></ICMSTot></total>
    </infNFe></NFe>`;
  return dentroDeProc ? `<?xml version="1.0"?><nfeProc versao="4.00">${nfe}</nfeProc>` : nfe;
};

const item = (numero: number, codigo: string, extra = '') => `
  <det nItem="${numero}">
    <prod>
      <cProd>${codigo}</cProd><xProd>Ração Bovinos 30kg</xProd>
      <cEAN>7891234567890</cEAN><NCM>23099010</NCM><CFOP>5102</CFOP>
      <uCom>FD</uCom><qCom>10.0000</qCom><vUnCom>150.00</vUnCom><vProd>1500.00</vProd>
      ${extra}
    </prod>
  </det>`;

describe('conversao de valores do XML', () => {
  // Number('1234.565') * 100 nao da 123456.5 exato: trabalhar nos digitos evita.
  it.each([
    ['0', 0],
    ['10', 1_000],
    ['150.00', 15_000],
    ['1234.56', 123_456],
    ['0.01', 1],
    ['1234.565', 123_457],
    ['1234.564', 123_456],
  ])('paraCentavos(%s) = %i', (entrada, esperado) => {
    expect(paraCentavos(entrada)).toBe(esperado);
  });

  it('paraMilesimos converte quantidade', () => {
    expect(paraMilesimos('10.0000')).toBe(10_000);
    expect(paraMilesimos('0.5')).toBe(500);
    expect(paraMilesimos('2.125')).toBe(2_125);
  });

  it('recusa valor que nao e numero, em vez de virar NaN silencioso', () => {
    expect(() => paraCentavos('abc')).toThrow(/inválido/);
    expect(() => paraMilesimos('1,5')).toThrow(/inválida/);
  });
});

// c20-2: importacao e leitura do XML.
describe('lerNotaDoXml', () => {
  it('le a nota dentro de nfeProc', () => {
    const nota = lerNotaDoXml(xmlDaNota(item(1, 'FORN-001')));

    expect(nota.chaveDeAcesso).toBe(CHAVE);
    expect(nota.numero).toBe('1234');
    expect(nota.emitente).toMatchObject({ cnpj: '12345678000199', uf: 'GO' });
    expect(nota.valorTotalCentavos).toBe(150_000);
    expect(nota.itens).toHaveLength(1);
  });

  it('le a nota solta, sem o envelope nfeProc', () => {
    expect(lerNotaDoXml(xmlDaNota(item(1, 'FORN-001'), false)).chaveDeAcesso).toBe(CHAVE);
  });

  it('le um item com todos os campos', () => {
    const [primeiro] = lerNotaDoXml(xmlDaNota(item(1, 'FORN-001'))).itens;

    expect(primeiro).toMatchObject({
      numero: 1,
      codigoDoFornecedor: 'FORN-001',
      descricao: 'Ração Bovinos 30kg',
      ean: '7891234567890',
      ncm: '23099010',
      quantidadeMilesimos: 10_000,
      valorUnitarioCentavos: 15_000,
      valorTotalCentavos: 150_000,
    });
  });

  it('le varios itens', () => {
    const nota = lerNotaDoXml(xmlDaNota(item(1, 'A') + item(2, 'B')));
    expect(nota.itens.map((i) => i.codigoDoFornecedor)).toEqual(['A', 'B']);
  });

  it('le lote e validade do rastro', () => {
    const comRastro = item(
      1,
      'A',
      '<rastro><nLote>L-2026-05</nLote><dVal>2027-05-31</dVal></rastro>',
    );
    const [primeiro] = lerNotaDoXml(xmlDaNota(comRastro)).itens;

    expect(primeiro?.lote).toBe('L-2026-05');
    expect(primeiro?.validade).toBe('2027-05-31');
  });

  it('trata SEM GTIN como ausencia de codigo de barras', () => {
    const semGtin = xmlDaNota(item(1, 'A')).replace('7891234567890', 'SEM GTIN');
    expect(lerNotaDoXml(semGtin).itens[0]?.ean).toBeNull();
  });

  it.each([
    ['vazio', ''],
    ['sem infNFe', '<?xml version="1.0"?><outraCoisa/>'],
  ])('recusa XML %s', (_caso, xml) => {
    expect(() => lerNotaDoXml(xml)).toThrow();
  });

  it('recusa chave de acesso fora de 44 digitos', () => {
    expect(() => lerNotaDoXml(xmlDaNota(item(1, 'A')).replace(CHAVE, '123'))).toThrow(
      /Chave de acesso inválida/,
    );
  });
});

// c20-1: as quatro manifestacoes.
describe('manifestacao do destinatario', () => {
  const pedido = (
    manifestacao: Parameters<typeof validarManifestacao>[0]['manifestacao'],
    justificativa: string | null = null,
  ) => ({ chaveDeAcesso: CHAVE, manifestacao, justificativa, por: CONFERENTE });

  it('ciencia e confirmacao nao exigem justificativa', () => {
    expect(() => validarManifestacao(pedido('CIENCIA_DA_OPERACAO'))).not.toThrow();
    expect(() => validarManifestacao(pedido('CONFIRMACAO_DA_OPERACAO'))).not.toThrow();
  });

  // As duas que negam a operacao perante a SEFAZ precisam de motivo.
  it.each([['DESCONHECIMENTO_DA_OPERACAO'], ['OPERACAO_NAO_REALIZADA']] as const)(
    '%s exige justificativa de 15 caracteres',
    (manifestacao) => {
      expect(() => validarManifestacao(pedido(manifestacao))).toThrow(/justificativa/);
      expect(() => validarManifestacao(pedido(manifestacao, 'curta'))).toThrow(/15 caracteres/);
      expect(() =>
        validarManifestacao(pedido(manifestacao, 'Mercadoria nunca chegou ao destino')),
      ).not.toThrow();
    },
  );
});

// c20-3 e c20-4.
describe('conferencia item a item', () => {
  const dePara = (extra: Partial<DeParaDoFornecedor> = {}): DeParaDoFornecedor => ({
    cnpjEmitente: '12345678000199',
    codigoDoFornecedor: 'FORN-001',
    productId: 'produto-interno-1',
    fatorDeConversao: 1,
    ...extra,
  });

  const notaDeDoisItens = () => lerNotaDoXml(xmlDaNota(item(1, 'FORN-001') + item(2, 'FORN-002')));

  it('resolve o de-para conhecido e deixa o desconhecido visivel', () => {
    const conferencia = prepararConferencia(notaDeDoisItens(), [dePara()]);

    expect(conferencia.itens[0]?.productId).toBe('produto-interno-1');
    expect(conferencia.itens[1]?.productId).toBeNull();
    expect(conferencia.itens[1]?.observacao).toMatch(/não vinculado/);
  });

  it('nao usa de-para de outro fornecedor com o mesmo codigo', () => {
    const conferencia = prepararConferencia(notaDeDoisItens(), [
      dePara({ cnpjEmitente: '99999999000199' }),
    ]);
    expect(conferencia.itens[0]?.productId).toBeNull();
  });

  // Fardo com 4 pacotes chega como 1 e entra como 4.
  it('aplica o fator de conversao na quantidade e no custo', () => {
    const conferencia = prepararConferencia(notaDeDoisItens(), [dePara({ fatorDeConversao: 4 })]);

    expect(conferencia.itens[0]?.quantidadeMilesimos).toBe(40_000);
    expect(conferencia.itens[0]?.custoUnitarioCentavos).toBe(3_750);
  });

  it('conferir um item nao conclui a nota', () => {
    let conferencia = prepararConferencia(notaDeDoisItens(), [dePara()]);
    conferencia = marcarItemConferido(conferencia, 1, {});

    expect(itensPendentes(conferencia)).toHaveLength(1);
    expect(() => concluirConferencia(conferencia, CONFERENTE, AGORA)).toThrow(/Faltam conferir 1/);
  });

  it('conclui quando todo item tem produto e foi conferido', () => {
    let conferencia = prepararConferencia(notaDeDoisItens(), [dePara()]);
    conferencia = marcarItemConferido(conferencia, 1, {});
    conferencia = marcarItemConferido(conferencia, 2, { productId: 'produto-interno-2' });

    const concluida = concluirConferencia(conferencia, CONFERENTE, AGORA);

    expect(concluida.situacao).toBe('CONFERIDA');
    expect(concluida.conferidaPor).toBe(CONFERENTE);
  });

  it('recusa conferir item que nao existe na nota', () => {
    const conferencia = prepararConferencia(notaDeDoisItens(), [dePara()]);
    expect(() => marcarItemConferido(conferencia, 99, {})).toThrow(/não existe/);
  });

  // A regra que o cartao poe em negrito.
  it('nao lanca no estoque sem conferencia humana', () => {
    const conferencia = prepararConferencia(notaDeDoisItens(), [dePara()]);
    expect(() => lancarNoEstoque(conferencia)).toThrow(/após a conferência humana/);
  });

  it('lanca depois de conferida, e nao deixa alterar o que ja foi lancado', () => {
    let conferencia = prepararConferencia(lerNotaDoXml(xmlDaNota(item(1, 'FORN-001'))), [dePara()]);
    conferencia = marcarItemConferido(conferencia, 1, {});
    conferencia = lancarNoEstoque(concluirConferencia(conferencia, CONFERENTE, AGORA));

    expect(conferencia.situacao).toBe('LANCADA');
    expect(() => marcarItemConferido(conferencia, 1, {})).toThrow(/já lançada/);
  });
});

// c20-6.
describe('custo medio', () => {
  it('estoque zerado assume o custo da entrada', () => {
    const depois = aplicarEntrada(
      { quantidadeMilesimos: 0, custoMedioCentavos: 0, ultimoCustoCentavos: 0 },
      10_000,
      15_000,
    );
    expect(depois).toEqual({
      quantidadeMilesimos: 10_000,
      custoMedioCentavos: 15_000,
      ultimoCustoCentavos: 15_000,
    });
  });

  // Media simples daria 15.00; ponderada da 19.90, que e o certo.
  it('pondera pela quantidade, e nao por media simples', () => {
    const depois = aplicarEntrada(
      { quantidadeMilesimos: 1_000, custoMedioCentavos: 1_000, ultimoCustoCentavos: 1_000 },
      99_000,
      2_000,
    );

    expect(depois.custoMedioCentavos).toBe(1_990);
    expect(depois.quantidadeMilesimos).toBe(100_000);
  });

  it('guarda o ultimo custo separado do medio', () => {
    const depois = aplicarEntrada(
      { quantidadeMilesimos: 10_000, custoMedioCentavos: 1_000, ultimoCustoCentavos: 1_000 },
      10_000,
      3_000,
    );

    expect(depois.custoMedioCentavos).toBe(2_000);
    expect(depois.ultimoCustoCentavos).toBe(3_000);
  });

  it('recusa quantidade nao positiva e custo negativo', () => {
    const posicao = {
      quantidadeMilesimos: 1_000,
      custoMedioCentavos: 100,
      ultimoCustoCentavos: 100,
    };
    expect(() => aplicarEntrada(posicao, 0, 100)).toThrow(/positiva/);
    expect(() => aplicarEntrada(posicao, 100, -1)).toThrow(/negativo/);
  });
});

// c20-7.
describe('contas a pagar da nota', () => {
  it('gera as parcelas das duplicatas', () => {
    const parcelas = parcelasDaNota(
      [
        { vencimento: '2026-07-10', valorCentavos: 75_000 },
        { vencimento: '2026-08-10', valorCentavos: 75_000 },
      ],
      150_000,
      '2026-07-10',
    );

    expect(parcelas).toEqual([
      { numero: 1, vencimento: '2026-07-10', valorCentavos: 75_000 },
      { numero: 2, vencimento: '2026-08-10', valorCentavos: 75_000 },
    ]);
  });

  it('sem duplicatas, gera parcela unica em vez de nao gerar nada', () => {
    expect(parcelasDaNota([], 150_000, '2026-07-10')).toEqual([
      { numero: 1, vencimento: '2026-07-10', valorCentavos: 150_000 },
    ]);
  });

  it('recusa duplicatas que nao fecham com o total da nota', () => {
    expect(() =>
      parcelasDaNota([{ vencimento: '2026-07-10', valorCentavos: 100 }], 150_000, '2026-07-10'),
    ).toThrow(/somam 100 e a nota tem 150000/);
  });
});

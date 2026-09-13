import type {
  AvaliacaoDoPedido,
  EventoDoPedido,
  PedidoDeVenda,
  PedidoNaFila,
  PermissoesDaDecisao,
  TipoDePedido,
} from '@synapse/types';
import {
  exposicaoDoPedido,
  impactoDaAprovacao,
  type AvaliacaoDoLote,
  type PedidoParaExposicao,
} from '@synapse/validation';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbaHistorico } from './analise/AbaHistorico';
import { AcoesDaDecisao } from './analise/AcoesDaDecisao';
import { capacidadeDaDecisao } from './analise/capacidade';
import { Impacto } from './analise/Impacto';
import { LiberacaoDoLote } from './ficha/LiberacaoDoLote';
import { aplicarAtalho } from './fila/atalhos';

/** A tela reflete a permissao antes do clique: quem nao pode aprovar excecao
 *  ve o botao desabilitado e o motivo escrito. E exposicao zero nunca vira
 *  "pagamento confirmado". */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const ADMIN: PermissoesDaDecisao = { decidir: true, aprovarExcecao: true };
const FINANCEIRO: PermissoesDaDecisao = { decidir: true, aprovarExcecao: false };
const SO_LEITURA: PermissoesDaDecisao = { decidir: false, aprovarExcecao: false };

const pedido = (extra: Partial<PedidoDeVenda> = {}) =>
  ({ id: 'p1', numero: 7, situacao: 'AGUARDANDO_ANALISE', ...extra }) as PedidoDeVenda;

const avaliacao = (violaPolitica: boolean) =>
  ({
    pedidoId: 'p1',
    violaPolitica,
    motivos: violaPolitica
      ? [
          {
            codigo: 'LIMITE_INSUFICIENTE',
            rotulo: 'Limite insuficiente',
            detalhe: '',
            violaPolitica: true,
          },
        ]
      : [],
  }) as unknown as AvaliacaoDoPedido;

const botao = (nome: RegExp) =>
  [...caixa.querySelectorAll('button')].find((item) => nome.test(item.textContent ?? '')) ?? null;

const acoes = (permissoes: PermissoesDaDecisao, viola: boolean, extra = {}) => {
  const aoEscolher = vi.fn();
  act(() =>
    raiz.render(
      <AcoesDaDecisao
        pedido={pedido(extra)}
        avaliacao={avaliacao(viola)}
        permissoes={permissoes}
        aoEscolher={aoEscolher}
      />,
    ),
  );
  return aoEscolher;
};

describe('capacidadeDaDecisao', () => {
  it('fora da politica sem a permissao de excecao: aprovar bloqueado, reprovar liberado', () => {
    expect(capacidadeDaDecisao(pedido(), avaliacao(true), FINANCEIRO)).toEqual({
      aprovacao: 'APROVAR_EXCECAO',
      podeAprovar: false,
      podeReprovar: true,
      avisos: [
        'Esta operação exige aprovação excepcional.',
        'Você não possui permissão para essa decisão.',
      ],
    });
  });

  it('dentro da politica, o financeiro aprova normalmente', () => {
    expect(capacidadeDaDecisao(pedido(), avaliacao(false), FINANCEIRO)).toMatchObject({
      aprovacao: 'APROVAR',
      podeAprovar: true,
      avisos: [],
    });
  });

  it('pedido ja decidido nao oferece decisao nem aviso', () => {
    expect(
      capacidadeDaDecisao(pedido({ situacao: 'APROVADO' }), avaliacao(true), FINANCEIRO),
    ).toMatchObject({ podeAprovar: false, podeReprovar: false, avisos: [] });
  });
});

describe('AcoesDaDecisao', () => {
  it('aprovador normal diante de excecao: botao desabilitado e o motivo escrito antes do clique', () => {
    const aoEscolher = acoes(FINANCEIRO, true);
    const aprovar = botao(/Aprovar excepcionalmente/);
    expect(aprovar?.disabled).toBe(true);
    expect(caixa.textContent).toContain('Esta operação exige aprovação excepcional.');
    expect(caixa.textContent).toContain('Você não possui permissão para essa decisão.');
    expect(aprovar?.getAttribute('aria-describedby')).toBe('aviso-de-permissao-da-decisao');
    act(() => aprovar?.click());
    expect(aoEscolher).not.toHaveBeenCalled();
    // Reprovar continua possivel: e decisao comum.
    expect(botao(/Reprovar/)?.disabled).toBe(false);
  });

  it('quem tem a permissao de excecao ve o botao ativo e sem aviso', () => {
    const aoEscolher = acoes(ADMIN, true);
    const aprovar = botao(/Aprovar excepcionalmente/);
    expect(aprovar?.disabled).toBe(false);
    expect(caixa.textContent).not.toContain('Você não possui permissão');
    act(() => aprovar?.click());
    expect(aoEscolher).toHaveBeenCalledWith('APROVAR_EXCECAO');
  });

  it('dentro da politica, o financeiro aprova', () => {
    const aoEscolher = acoes(FINANCEIRO, false);
    act(() => botao(/Aprovar pedido/)?.click());
    expect(aoEscolher).toHaveBeenCalledWith('APROVAR');
  });

  it('sem permissao de decidir, nenhum botao de decisao fica ativo', () => {
    acoes(SO_LEITURA, false);
    expect(botao(/Aprovar pedido/)?.disabled).toBe(true);
    expect(botao(/Reprovar/)?.disabled).toBe(true);
    expect(caixa.textContent).toContain('Você não possui permissão para decidir crédito.');
  });
});

const lote = (quantos: number, excepcionais: readonly string[]) =>
  ({
    itens: Array.from({ length: quantos }, (_, indice) => ({ pedidoId: `p${indice}` })),
    excepcionais,
    valorComercialCentavos: 800_000,
    exposicaoCentavos: 800_000,
    disponivelDepoisCentavos: -200_000,
    utilizacaoDepoisPercentual: 120,
  }) as unknown as AvaliacaoDoLote;

const liberacao = (permissoes: PermissoesDaDecisao, excepcionais: readonly string[]) => {
  const aoLiberar = vi.fn();
  act(() =>
    raiz.render(
      <LiberacaoDoLote
        lote={lote(2, excepcionais)}
        total={2}
        liberando={false}
        permissoes={permissoes}
        aoLiberar={aoLiberar}
      />,
    ),
  );
  return aoLiberar;
};

describe('LiberacaoDoLote', () => {
  it('lote com pedido fora da politica e sem a permissao: desabilitado, com o que fazer', () => {
    const aoLiberar = liberacao(FINANCEIRO, ['p1']);
    const aprovar = botao(/Aprovar excepcionalmente/);
    expect(aprovar?.disabled).toBe(true);
    expect(caixa.textContent).toContain('Esta operação exige aprovação excepcional.');
    expect(caixa.textContent).toContain('Você não possui permissão para essa decisão.');
    expect(caixa.textContent).toContain('Desmarque o pedido fora da política');
    act(() => aprovar?.click());
    expect(aoLiberar).not.toHaveBeenCalled();
  });

  it('sem pedido fora da politica, o financeiro aprova o lote', () => {
    const aoLiberar = liberacao(FINANCEIRO, []);
    act(() => botao(/Aprovar 2 pedidos/)?.click());
    expect(aoLiberar).toHaveBeenCalled();
  });

  it('com a permissao, o lote excepcional segue para a justificativa', () => {
    const aoLiberar = liberacao(ADMIN, ['p1']);
    act(() => botao(/Aprovar excepcionalmente/)?.click());
    expect(aoLiberar).toHaveBeenCalled();
  });
});

/** Nenhum texto da tela pode afirmar pagamento que o Synapse nao registra. */
const AFIRMA_PAGAMENTO = /pagamento (confirmado|recebido)|já (está|foi) pago|pedido pago/i;

const situacao = {
  limiteCentavos: 1_000_000,
  comprometidoCentavos: 400_000,
} as Parameters<typeof impactoDaAprovacao>[0];

const venda = (dados: Partial<PedidoParaExposicao>): PedidoParaExposicao => ({
  tipo: 'VENDA',
  formaDePagamento: 'Boleto',
  condicaoDePagamento: '28 dias',
  vencimentosEmDias: [28],
  totalCentavos: 300_000,
  ...dados,
});

describe('Impacto: exposicao zero nao e pagamento confirmado', () => {
  it.each([
    [
      'PIX',
      venda({ formaDePagamento: 'PIX', condicaoDePagamento: 'À vista', vencimentosEmDias: [0] }),
    ],
    [
      'dinheiro',
      venda({
        formaDePagamento: 'Dinheiro',
        condicaoDePagamento: 'À vista',
        vencimentosEmDias: [0],
      }),
    ],
    ['cartao', venda({ formaDePagamento: 'Cartão de crédito' })],
    [
      'troca',
      venda({ tipo: 'TROCA', formaDePagamento: 'Troca', condicaoDePagamento: 'Sem cobrança' }),
    ],
  ])('%s', (_nome, dados) => {
    const exposicao = exposicaoDoPedido(dados);
    act(() =>
      raiz.render(
        <Impacto impacto={impactoDaAprovacao(situacao, exposicao)} exposicao={exposicao} />,
      ),
    );
    expect(caixa.textContent).toContain('Esta operação não compromete limite de crédito.');
    expect(caixa.textContent).not.toMatch(AFIRMA_PAGAMENTO);
  });

  it('PIX diz com todas as letras que o recebimento nao e registrado', () => {
    const exposicao = exposicaoDoPedido(
      venda({ formaDePagamento: 'PIX', condicaoDePagamento: 'À vista', vencimentosEmDias: [0] }),
    );
    act(() =>
      raiz.render(
        <Impacto impacto={impactoDaAprovacao(situacao, exposicao)} exposicao={exposicao} />,
      ),
    );
    expect(caixa.textContent).toContain('O pedido não registra se o pagamento já foi recebido.');
  });
});

describe('atalho "Não é venda"', () => {
  it('usa a classificacao compartilhada: tudo que nao e venda efetiva', () => {
    const tipos: TipoDePedido[] = [
      'VENDA',
      'BONIFICACAO',
      'TROCA',
      'AMOSTRA',
      'DEVOLUCAO',
      'CONSIGNACAO',
    ];
    const linhas = tipos.map((tipo) => ({ pedido: { tipo } }) as unknown as PedidoNaFila);
    expect(aplicarAtalho(linhas, 'nao-venda').map((linha) => linha.pedido.tipo)).toEqual([
      'BONIFICACAO',
      'TROCA',
      'AMOSTRA',
      'DEVOLUCAO',
      'CONSIGNACAO',
    ]);
  });
});

describe('AbaHistorico: a aprovação excepcional auditada', () => {
  const evento: EventoDoPedido = {
    tipo: 'LIBERADO_EXCECAO',
    etapa: 'CREDITO',
    em: '2026-09-13T16:46:15.860Z',
    porUid: 'analista-1',
    porNome: 'João Crédito',
    detalhe: 'Aprovado fora da política (limite insuficiente) — segue para o faturamento',
    justificativa: 'Cliente quitou o título vencido hoje por PIX; comprovante com o financeiro.',
    motivos: ['LIMITE_INSUFICIENTE', 'SEM_HISTORICO_DE_CREDITO'],
    motivosForaDaPolitica: ['LIMITE_INSUFICIENTE'],
    cliente: { id: 'cliente-1', nome: 'Mercado do Bairro' },
    valores: [
      {
        campo: 'valorComercial',
        rotulo: 'Valor comercial do pedido',
        unidade: 'centavos',
        antes: null,
        depois: 960_000,
      },
      {
        campo: 'exposicao',
        rotulo: 'Exposição do pedido',
        unidade: 'centavos',
        antes: null,
        depois: 960_000,
      },
      {
        campo: 'limite',
        rotulo: 'Limite de crédito',
        unidade: 'centavos',
        antes: 1_000_000,
        depois: 1_000_000,
      },
      {
        campo: 'comprometido',
        rotulo: 'Comprometido',
        unidade: 'centavos',
        antes: 200_000,
        depois: 1_160_000,
      },
      {
        campo: 'disponivel',
        rotulo: 'Disponível',
        unidade: 'centavos',
        antes: 800_000,
        depois: -160_000,
      },
      {
        campo: 'utilizacao',
        rotulo: 'Utilização do limite',
        unidade: 'percentual',
        antes: 20,
        depois: 116,
      },
    ],
  };

  it('mostra quem decidiu, a justificativa, os motivos fora da política e os números da hora', () => {
    act(() => raiz.render(<AbaHistorico historico={[evento]} />));
    const texto = caixa.textContent ?? '';
    expect(texto).toContain('João Crédito');
    expect(texto).toContain('Aprovado fora da política (limite insuficiente)');
    expect(texto).toContain('Justificativa: Cliente quitou o título vencido hoje por PIX');
    expect(texto).toContain('Fora da política: Limite insuficiente');
    expect(texto).toContain('Motivos na hora: Limite insuficiente, Sem histórico de crédito');
    expect(texto).toContain('Comprometido');
    expect(texto).toContain('Disponível');
    expect(texto).not.toMatch(AFIRMA_PAGAMENTO);
  });

  it('evento comum não inventa "fora da política"', () => {
    const comum: EventoDoPedido = {
      ...evento,
      tipo: 'LIBERADO',
      detalhe: 'Liberado na análise de crédito — segue para o faturamento',
      motivos: ['ANALISE_OBRIGATORIA'],
      motivosForaDaPolitica: [],
      justificativa: null,
    };
    act(() => raiz.render(<AbaHistorico historico={[comum]} />));
    expect(caixa.textContent).not.toContain('Fora da política:');
    expect(caixa.textContent).toContain('Motivos na hora: Análise de rotina');
  });
});

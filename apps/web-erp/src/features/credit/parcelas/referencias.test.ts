import type { CarteiraDoCliente } from '@synapse/types';
import { calendarioDoPedido } from '@synapse/validation';
import { describe, expect, it } from 'vitest';
import { hojeLocal } from '../analise';
import { diferencaParaMedia, referenciasDoCliente } from './referencias';

describe('comparacao com o historico do cliente', () => {
  const carteira = {
    pagamentos: [{ valorCentavos: 20_000 }, { valorCentavos: 30_000 }],
    titulosEmAberto: [{ saldoCentavos: 10_000 }],
  } as unknown as CarteiraDoCliente;

  it('calcula a media paga e a media em aberto', () => {
    expect(referenciasDoCliente(carteira)).toEqual({
      mediaPagaCentavos: 25_000,
      mediaEmAbertoCentavos: 10_000,
    });
  });

  it('diz quanto a parcela passa da media', () => {
    expect(diferencaParaMedia(30_000, 25_000)).toBe(20);
    expect(diferencaParaMedia(20_000, 25_000)).toBe(-20);
    expect(diferencaParaMedia(20_000, null)).toBeNull();
  });
});

describe('simulacao na tela usa a regra compartilhada com a API', () => {
  const pedido = {
    tipo: 'VENDA' as const,
    formaDePagamento: 'Boleto',
    condicaoDePagamento: '14/21/28/35',
    vencimentosEmDias: [],
    totalCentavos: 100_003,
    situacao: 'AGUARDANDO_ANALISE' as const,
    nota: null,
  };

  it('a data-base e o dia local de quem olha, e a soma fecha o total', () => {
    const hoje = hojeLocal(new Date(2026, 8, 13, 23, 30));
    expect(hoje).toBe('2026-09-13');
    const calendario = calendarioDoPedido(pedido, [], hoje);
    expect(calendario.parcelas.map((p) => p.vencimento)).toEqual([
      '2026-09-27',
      '2026-10-04',
      '2026-10-11',
      '2026-10-18',
    ]);
    expect(calendario.parcelas.map((p) => p.valorCentavos)).toEqual([
      25_001, 25_001, 25_001, 25_000,
    ]);
  });
});

import type { ObservacaoDoPedido, PedidoDeVenda } from '@synapse/types';
import {
  liberarPedido,
  motivoParaNaoLiberar,
  observarPedido,
  registrarImpressao,
} from './historico';

const ANALISTA = { uid: 'analista-1', nome: 'Carla Crédito' };
const AGORA = '2026-09-13T10:00:00.000Z';

const pedido = (extra: Partial<PedidoDeVenda> = {}): PedidoDeVenda =>
  ({
    id: 'pedido-1',
    numero: 101,
    situacao: 'AGUARDANDO_ANALISE',
    impressoPor: [],
    historico: [],
    observacoes: [],
    ...extra,
  }) as PedidoDeVenda;

describe('liberacao no credito', () => {
  it('libera o que espera analise e registra quem liberou', () => {
    const liberado = liberarPedido(pedido(), ANALISTA, AGORA);
    expect(liberado.situacao).toBe('APROVADO');
    expect(liberado.analisadoPor).toBe('analista-1');
    expect(liberado.historico.at(-1)).toMatchObject({
      tipo: 'LIBERADO',
      etapa: 'CREDITO',
      porNome: 'Carla Crédito',
      em: AGORA,
    });
  });

  it('nao libera duas vezes nem o que ja saiu da fila', () => {
    expect(motivoParaNaoLiberar(pedido())).toBeNull();
    expect(motivoParaNaoLiberar(pedido({ situacao: 'APROVADO' }))).toBe(
      'Pedido 101 já está liberado',
    );
    expect(motivoParaNaoLiberar(pedido({ situacao: 'FATURADO' }))).toBe(
      'Pedido 101 já está faturado',
    );
    expect(motivoParaNaoLiberar(null)).toBe('Pedido não encontrado');
  });

  it('funciona com pedido antigo, gravado antes de existir historico', () => {
    const antigo = { ...pedido(), historico: undefined } as unknown as PedidoDeVenda;
    expect(liberarPedido(antigo, ANALISTA, AGORA).historico).toHaveLength(1);
  });
});

describe('observacoes e impressao', () => {
  const observacao: ObservacaoDoPedido = {
    id: 'obs-1',
    etapa: 'CREDITO',
    texto: 'Cliente pediu para faturar só depois do dia 20.',
    em: AGORA,
    porUid: 'analista-1',
    porNome: 'Carla Crédito',
  };

  it('observacao entra na lista e deixa rastro com a etapa', () => {
    const anotado = observarPedido(pedido(), observacao);
    expect(anotado.observacoes).toEqual([observacao]);
    expect(anotado.historico.at(-1)).toMatchObject({ tipo: 'OBSERVACAO', etapa: 'CREDITO' });
  });

  it('observacao longa aparece resumida no historico, inteira na lista', () => {
    const longa = { ...observacao, texto: 'x'.repeat(300) };
    const anotado = observarPedido(pedido(), longa);
    expect(anotado.observacoes[0]?.texto).toHaveLength(300);
    expect(anotado.historico.at(-1)?.detalhe).toHaveLength(138);
  });

  it('imprimir marca e registra; desmarcar so tira a marca', () => {
    const impresso = registrarImpressao(pedido(), ANALISTA, AGORA, true);
    expect(impresso.impressoPor).toEqual(['analista-1']);
    expect(impresso.historico.at(-1)?.tipo).toBe('IMPRESSO');

    const desmarcado = registrarImpressao(impresso, ANALISTA, AGORA, false);
    expect(desmarcado.impressoPor).toEqual([]);
    expect(desmarcado.historico).toHaveLength(1);
  });
});

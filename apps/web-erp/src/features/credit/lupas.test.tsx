import type {
  AvaliacaoDoPedido,
  CarteiraDoCliente,
  DetalheDaNota,
  NotaDoCliente,
  PedidoDeVenda,
} from '@synapse/types';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoricoDoCliente } from './HistoricoDoCliente';
import { PagamentosDoCliente } from './PagamentosDoCliente';
import { PedidosEmAnalise } from './PedidosEmAnalise';
import { TitulosEmAberto } from './TitulosEmAberto';
import { DetalheDaNota as TelaDaNota } from './documentos/DetalheDaNota';
import type { Documento } from './documentos/navegacao';

/** As lupas da ficha: cada uma abre o documento do seu tipo, e a analise de
 *  credito so abre pelos pedidos em analise. Renderiza de verdade no jsdom. */

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

const desenhar = (elemento: ReactNode) => act(() => raiz.render(elemento));

const clicar = (rotulo: string) => {
  const botao = caixa.querySelector<HTMLButtonElement>(`button[aria-label="${rotulo}"]`);
  if (!botao) throw new Error(`Botão "${rotulo}" não encontrado`);
  act(() => botao.click());
};

const pedido = {
  id: 'pedido-95',
  numero: 95,
  tipo: 'VENDA',
  situacao: 'FATURADO',
  origem: 'MOBILE',
  formaDePagamento: 'Boleto',
  condicaoDePagamento: '28/35',
  vencimentosEmDias: [28, 35],
  prazoMedioEmDias: 32,
  totalCentavos: 137_400,
  vendedorNome: 'Marcos',
  enviadoEm: '2026-08-20T10:00:00.000Z',
  itens: [],
  historico: [],
  observacoes: [],
} as unknown as PedidoDeVenda;

const nota: NotaDoCliente = {
  pedidoId: 'pedido-95',
  pedidoNumero: 95,
  pedidoSituacao: 'CANCELADO',
  numero: 4388,
  serie: 1,
  chaveDeAcesso: null,
  emitidaEm: '2026-08-20T11:00:00.000Z',
  totalCentavos: 137_400,
};

const carteira: CarteiraDoCliente = {
  titulosEmAberto: [
    {
      id: 't-aberto',
      pedidoId: 'pedido-95',
      numero: '4388',
      serie: '1',
      parcela: '2/2',
      vencimento: '2026-10-17',
      valorCentavos: 2_000,
      saldoCentavos: 1_200,
      diasDeAtraso: 0,
    },
  ],
  totalVencidoCentavos: 0,
  totalAVencerCentavos: 1_200,
  pagamentos: [
    {
      tituloId: 't-pago',
      pedidoId: 'pedido-95',
      numero: '4388',
      serie: '1',
      parcela: '1/2',
      vencimento: '2026-09-17',
      pagoEm: '2026-09-11',
      valorCentavos: 2_000,
      diasDoPagamento: -6,
    },
  ],
  totalPagoCentavos: 2_000,
};

describe('lupas da ficha do cliente', () => {
  it('ultimos pedidos abrem o pedido, e ultimas NFs abrem a nota', () => {
    const aoAbrir = vi.fn<(documento: Documento) => void>();
    desenhar(
      <HistoricoDoCliente
        aba="pedidos"
        onTrocarAba={() => undefined}
        pedidos={[pedido]}
        notas={[nota]}
        aoAbrirDocumento={aoAbrir}
      />,
    );
    clicar('Abrir o pedido 95');
    expect(aoAbrir).toHaveBeenLastCalledWith({
      tipo: 'pedido',
      id: 'pedido-95',
      rotulo: 'Pedido 95',
    });

    desenhar(
      <HistoricoDoCliente
        aba="notas"
        onTrocarAba={() => undefined}
        pedidos={[pedido]}
        notas={[nota]}
        aoAbrirDocumento={aoAbrir}
      />,
    );
    clicar('Abrir a NF 4388');
    expect(aoAbrir).toHaveBeenLastCalledWith({ tipo: 'nota', id: 'pedido-95', rotulo: 'NF 4388' });
  });

  it('NF de pedido cancelado aparece como cancelada na lista', () => {
    desenhar(
      <HistoricoDoCliente
        aba="notas"
        onTrocarAba={() => undefined}
        pedidos={[]}
        notas={[nota]}
        aoAbrirDocumento={() => undefined}
      />,
    );
    expect(caixa.textContent).toContain('Pedido cancelado');
  });

  it('titulo a receber abre o titulo em aberto; titulo pago abre a liquidacao', () => {
    const aoAbrir = vi.fn<(documento: Documento) => void>();
    desenhar(<TitulosEmAberto carteira={carteira} aoAbrirDocumento={aoAbrir} />);
    clicar('Abrir o título 4388 parcela 2/2');
    expect(aoAbrir).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'titulo', id: 't-aberto', visao: 'aberto' }),
    );

    desenhar(
      <PagamentosDoCliente carteira={carteira} pagoEm12Meses={2_000} aoAbrirDocumento={aoAbrir} />,
    );
    clicar('Abrir a liquidação do título 4388 parcela 1/2');
    expect(aoAbrir).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'titulo', id: 't-pago', visao: 'pago' }),
    );
    expect(caixa.textContent).toContain('6 dias antes');
    expect(caixa.textContent).not.toContain('-6');
  });

  it('pedido em analise abre a analise de credito, e nao um documento', () => {
    const aoAbrirAnalise = vi.fn();
    const avaliacao = {
      pedidoId: 'pedido-101',
      exposicao: { exposicaoCentavos: 1_000, explicacao: '' },
      motivos: [
        {
          codigo: 'ANALISE_OBRIGATORIA',
          rotulo: 'Análise de rotina',
          detalhe: '',
          violaPolitica: false,
        },
      ],
    } as unknown as AvaliacaoDoPedido;
    const emAnalise = {
      ...pedido,
      id: 'pedido-101',
      numero: 101,
      situacao: 'AGUARDANDO_ANALISE',
    } as PedidoDeVenda;
    desenhar(
      <PedidosEmAnalise
        pedidos={[emAnalise]}
        avaliacoes={[avaliacao]}
        lote={{
          itens: [],
          valorComercialCentavos: 0,
          exposicaoCentavos: 0,
          disponivelDepoisCentavos: null,
          utilizacaoDepoisPercentual: null,
          excepcionais: [],
        }}
        selecionados={new Set()}
        aoAlternar={() => undefined}
        aoSelecionarTodos={() => undefined}
        aoAbrir={aoAbrirAnalise}
        permissoes={{ decidir: true, aprovarExcecao: true }}
        aoLiberar={() => undefined}
        liberando={false}
      />,
    );
    const linha = caixa.querySelector('tbody tr');
    act(() => linha?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    expect(aoAbrirAnalise).toHaveBeenCalledWith(emAnalise);
    expect(caixa.textContent).toContain('Análise de rotina');
  });
});

describe('detalhe de nota de pedido cancelado', () => {
  it('diz que a origem esta cancelada e nao oferece XML nem DANFE que nao existem', () => {
    const detalhe: DetalheDaNota = {
      pedidoId: 'pedido-95',
      pedidoNumero: 95,
      pedidoSituacao: 'CANCELADO',
      numero: 4388,
      serie: 1,
      chaveDeAcesso: null,
      emitidaEm: '2026-08-20T11:00:00.000Z',
      cliente: { id: 'c' as never, nome: 'Padaria Estrela', documento: '98765432000110' },
      vendedorNome: 'Marcos',
      produtosCentavos: 137_400,
      descontoCentavos: 0,
      freteCentavos: null,
      totalCentavos: 137_400,
      titulos: [],
      eventos: [],
      situacaoFiscal: null,
      xmlDisponivel: false,
      danfeDisponivel: false,
    };
    desenhar(<TelaDaNota detalhe={detalhe} aoSeguir={() => undefined} />);
    expect(caixa.textContent).toContain('Pedido de origem cancelado');
    expect(caixa.textContent).toContain('XML e DANFE ainda não são guardados');
    expect(caixa.textContent).toContain('98.765.432/0001-10');
  });
});

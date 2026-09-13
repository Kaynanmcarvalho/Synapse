import { describe, expect, it } from 'vitest';
import {
  abrirPelaLupa,
  documentoDaNota,
  documentoDoPedido,
  documentoDoTitulo,
  irPara,
  PROFUNDIDADE_MAXIMA,
  seguirVinculo,
  voltar,
  type Documento,
} from './navegacao';

const pedido = documentoDoPedido({ id: 'pedido-95', numero: 95 });
const nota = documentoDaNota({ pedidoId: 'pedido-95', numero: 4388 });
const titulo = documentoDoTitulo({ id: 't-1', numero: '4388', parcela: '1/2' });

describe('caminho entre documentos', () => {
  it('Pedido > NF > Titulo, com rotulos de breadcrumb', () => {
    const caminho = seguirVinculo(seguirVinculo(abrirPelaLupa(pedido), nota), titulo);
    expect(caminho.map((doc) => doc.rotulo)).toEqual(['Pedido 95', 'NF 4388', 'Título 4388 · 1/2']);
  });

  it('voltar sobe um passo e nao passa do primeiro', () => {
    const caminho = [pedido, nota, titulo];
    expect(voltar(caminho)).toEqual([pedido, nota]);
    expect(voltar([pedido])).toEqual([pedido]);
  });

  it('seguir para um documento que ja esta no caminho corta o resto, sem dar voltas', () => {
    expect(seguirVinculo([pedido, nota, titulo], pedido)).toEqual([pedido]);
  });

  it('clicar no breadcrumb vai direto ao documento', () => {
    expect(irPara([pedido, nota, titulo], 1)).toEqual([pedido, nota]);
    expect(irPara([pedido], 5)).toEqual([pedido]);
  });

  it('a lupa sempre comeca um caminho novo', () => {
    expect(abrirPelaLupa(nota)).toEqual([nota]);
  });

  it('nao empilha para sempre', () => {
    let caminho: readonly Documento[] = abrirPelaLupa(pedido);
    for (let i = 0; i < 10; i += 1) {
      caminho = seguirVinculo(
        caminho,
        documentoDoTitulo({ id: `t${i}`, numero: `${i}`, parcela: '1/1' }),
      );
    }
    expect(caminho).toHaveLength(PROFUNDIDADE_MAXIMA);
  });
});

describe('cada lupa abre o documento certo', () => {
  it('ultimos pedidos abrem o pedido; ultimas NFs abrem a nota; titulos abrem o titulo', () => {
    expect(documentoDoPedido({ id: 'p', numero: 1 }).tipo).toBe('pedido');
    expect(documentoDaNota({ pedidoId: 'p', numero: 2 })).toMatchObject({ tipo: 'nota', id: 'p' });
    expect(documentoDoTitulo({ id: 't', numero: '3', parcela: '1/1' }, 'pago')).toMatchObject({
      tipo: 'titulo',
      visao: 'pago',
    });
  });
});

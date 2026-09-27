import { MENUS } from '../../app/menu/menu.data';
import { buscarNaNavegacao, contextoDoItem, itensComAtalho } from './menuSearch';

describe('buscarNaNavegacao', () => {
  it('consulta vazia nao acha nada', () => {
    expect(buscarNaNavegacao(MENUS, '')).toEqual([]);
    expect(buscarNaNavegacao(MENUS, '   ')).toEqual([]);
  });

  it('acha por rotulo, ignorando acento e caixa', () => {
    const achados = buscarNaNavegacao(MENUS, 'credito');
    expect(achados.some((item) => item.rotulo === 'Análise de Crédito')).toBe(true);
  });

  it('"analise" acha Análise de Crédito', () => {
    const achados = buscarNaNavegacao(MENUS, 'analise');
    expect(achados.some((item) => item.rotulo === 'Análise de Crédito')).toBe(true);
  });

  it('"configuracao" acha algo em Configurações (acento e plural/singular à parte)', () => {
    const achados = buscarNaNavegacao(MENUS, 'configuracao');
    expect(achados.length).toBeGreaterThan(0);
  });

  it('ranking: rotulo exato vem antes de rotulo que só começa igual', () => {
    const achados = buscarNaNavegacao(MENUS, 'clientes');
    const indiceExato = achados.findIndex((item) => item.rotulo === 'Clientes');
    const indiceComeco = achados.findIndex(
      (item) => item.rotulo !== 'Clientes' && item.rotulo.toLowerCase().startsWith('clientes'),
    );
    if (indiceComeco !== -1) expect(indiceExato).toBeLessThan(indiceComeco);
  });

  it('acha por contexto (trilha) quando o rotulo do item não bate', () => {
    // "Financeiro" é o rótulo de um submenu dentro de Cadastros — qualquer
    // item folha dentro dele deve aparecer buscando "financeiro", mesmo que
    // o rótulo do item em si não contenha a palavra.
    const achados = buscarNaNavegacao(MENUS, 'financeiro');
    expect(achados.some((item) => item.trilha.includes('Financeiro'))).toBe(true);
  });

  it('respeita o limite pedido', () => {
    const achados = buscarNaNavegacao(MENUS, 'e', 3);
    expect(achados.length).toBeLessThanOrEqual(3);
  });

  it('não acha o que não existe', () => {
    expect(buscarNaNavegacao(MENUS, 'xyzxyzxyz')).toEqual([]);
  });

  it('"nfe" acha o item cujo rótulo tem a sigla com hífen e parênteses ("(NF-e)")', () => {
    const achados = buscarNaNavegacao(MENUS, 'nfe');
    expect(
      achados.some((item) => item.rotulo.includes('NF-e')),
      'nenhum item com "NF-e" no rótulo foi encontrado buscando "nfe"',
    ).toBe(true);
  });

  it('"boletos" acha pelo caminho da rota quando o rótulo de verdade é outro', () => {
    const achados = buscarNaNavegacao(MENUS, 'boletos');
    expect(achados.some((item) => item.caminho === '/financeiro/boletos')).toBe(true);
  });

  it('ranking: achado por caminho vem depois de um achado por rótulo, mesmo com mais letras em comum', () => {
    // "Crédito do Cliente" bate no rótulo; se alguma outra tela só bater pelo
    // caminho, o rótulo sempre vem antes — o caminho é o critério mais fraco.
    const achados = buscarNaNavegacao(MENUS, 'credito', 20);
    const indicePorRotulo = achados.findIndex((item) =>
      item.rotulo.toLowerCase().includes('crédito'),
    );
    expect(indicePorRotulo).toBe(0);
  });
});

describe('itensComAtalho', () => {
  it('só traz itens que realmente têm atalho de teclado', () => {
    const itens = itensComAtalho(MENUS);
    expect(itens.length).toBeGreaterThan(0);
    expect(itens.every((item) => item.atalho)).toBe(true);
  });
});

describe('contextoDoItem', () => {
  it('não repete o próprio rótulo do item', () => {
    const [item] = buscarNaNavegacao(MENUS, 'analise de credito');
    expect(item).toBeDefined();
    const contexto = contextoDoItem(item!);
    expect(contexto).not.toContain('Análise de Crédito');
    expect(contexto).toBe('Vendas');
  });
});

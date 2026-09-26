import { MENUS } from './menu.data';
import type { EntradaDeMenu } from './menu.types';

/** O contrato de navegação do Synapse, congelado.
 *
 *  A ordem dos módulos, a ordem dos itens dentro de cada menu, os separadores,
 *  os submenus, os atalhos e os caminhos **são decisão de produto**: quem vem do
 *  Syndata acha cada rotina onde já procurava. Mexer nisso sem querer custa a
 *  memória muscular de quem usa o sistema o dia inteiro.
 *
 *  Por isso a árvore inteira — não só o primeiro nível — vira um arquivo de
 *  referência (`navegacao.contrato.snap`). Qualquer mudança de ordem, rótulo,
 *  id, caminho, atalho, trilha, separador ou feature aparece como diferença no
 *  teste. Quando a mudança for intencional, atualize o arquivo com
 *  `pnpm --filter @synapse/web-erp test -- -u` e explique no commit o que moveu.
 *
 *  O que este teste NÃO congela: aparência, largura, tipografia, ícones e
 *  comportamento visual — isso pode evoluir à vontade. */

const campo = (rotulo: string, valor: string | undefined): string =>
  valor ? ` ${rotulo}=${valor}` : '';

const linhasDe = (entradas: readonly EntradaDeMenu[], nivel: number): string[] =>
  entradas.flatMap((entrada) => {
    const recuo = '  '.repeat(nivel);
    if (entrada.tipo === 'separador') return [`${recuo}--- ${entrada.id}`];
    if (entrada.tipo === 'submenu') {
      return [
        `${recuo}> ${entrada.rotulo}  id=${entrada.id}` +
          `${campo('feature', entrada.feature)}${campo('icone', entrada.icone)}`,
        ...linhasDe(entrada.itens, nivel + 1),
      ];
    }
    return [
      `${recuo}- ${entrada.rotulo}  id=${entrada.id} caminho=${entrada.caminho}` +
        ` situacao=${entrada.situacao}${campo('atalho', entrada.atalho?.rotulo)}` +
        `${campo('feature', entrada.feature)}${campo('icone', entrada.icone)}` +
        ` trilha=${entrada.trilha.join(' > ')}`,
    ];
  });

interface Contagem {
  readonly item: number;
  readonly submenu: number;
  readonly separador: number;
  readonly comTela: number;
  readonly comAtalho: number;
}

const NADA: Contagem = { item: 0, submenu: 0, separador: 0, comTela: 0, comAtalho: 0 };

const somar = (a: Contagem, b: Contagem): Contagem => ({
  item: a.item + b.item,
  submenu: a.submenu + b.submenu,
  separador: a.separador + b.separador,
  comTela: a.comTela + b.comTela,
  comAtalho: a.comAtalho + b.comAtalho,
});

const contar = (entradas: readonly EntradaDeMenu[]): Contagem =>
  entradas.reduce((total, entrada) => {
    if (entrada.tipo === 'separador') return somar(total, { ...NADA, separador: 1 });
    if (entrada.tipo === 'submenu') {
      return somar(somar(total, { ...NADA, submenu: 1 }), contar(entrada.itens));
    }
    return somar(total, {
      ...NADA,
      item: 1,
      comTela: entrada.situacao === 'disponivel' ? 1 : 0,
      comAtalho: entrada.atalho ? 1 : 0,
    });
  }, NADA);

describe('contrato de navegação', () => {
  it('a árvore inteira continua igual', async () => {
    const contrato = MENUS.flatMap((menu) => [
      `${menu.rotulo}  id=${menu.id}`,
      ...linhasDe(menu.itens, 1),
    ]).join('\n');

    await expect(contrato).toMatchFileSnapshot('./navegacao.contrato.snap');
  });

  // Falha legível antes mesmo de abrir o diff do arquivo: diz o que sumiu.
  it('o tamanho da árvore continua igual', () => {
    const total = MENUS.map((menu) => contar(menu.itens)).reduce(somar, NADA);

    expect({ modulos: MENUS.length, ...total }).toEqual({
      modulos: 9,
      item: 214,
      submenu: 27,
      separador: 66,
      comTela: 26,
      comAtalho: 8,
    });
  });

  it('todo item leva a algum lugar e toda trilha começa no módulo', () => {
    for (const menu of MENUS) {
      const conferir = (entradas: readonly EntradaDeMenu[]): void => {
        for (const entrada of entradas) {
          if (entrada.tipo === 'submenu') conferir(entrada.itens);
          if (entrada.tipo !== 'item') continue;
          expect(entrada.caminho).toMatch(/^\//);
          expect(entrada.trilha[0]).toBe(menu.rotulo);
          expect(entrada.trilha.at(-1)).toBe(entrada.rotulo);
          // Item sem tela cai na rota generica, que mostra onde a opcao mora.
          if (entrada.situacao === 'em-breve') {
            expect(entrada.caminho).toBe(`/modulo/${entrada.id}`);
          }
        }
      };
      conferir(menu.itens);
    }
  });
});

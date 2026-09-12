import type { FeatureKey } from '../useTenantExperience';
import type {
  Atalho,
  EntradaDeMenu,
  EsbocoDeEntrada,
  ItemDeMenu,
  MenuPrincipal,
} from './menu.types';

type OpcoesDeItem = {
  readonly para?: string;
  readonly atalho?: string;
  readonly feature?: FeatureKey;
};

export const item = (rotulo: string, opcoes: OpcoesDeItem = {}): EsbocoDeEntrada => ({
  tipo: 'item',
  rotulo,
  ...opcoes,
});

export const submenu = (
  rotulo: string,
  itens: readonly EsbocoDeEntrada[],
  feature?: FeatureKey,
): EsbocoDeEntrada => ({ tipo: 'submenu', rotulo, itens, ...(feature ? { feature } : {}) });

export const SEPARADOR: EsbocoDeEntrada = { tipo: 'separador' };

/** `Controle de Notas (NF-e)` -> `controle-de-notas-nf-e`. */
export const slug = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const lerAtalho = (texto: string): Atalho => {
  const partes = texto.split('+').map((parte) => parte.trim());
  const tecla = partes.at(-1) ?? '';
  const modificadores = new Set(partes.slice(0, -1).map((parte) => parte.toLowerCase()));
  return {
    tecla,
    ctrl: modificadores.has('ctrl'),
    alt: modificadores.has('alt'),
    shift: modificadores.has('shift'),
    rotulo: texto,
  };
};

const montarEntradas = (
  esbocos: readonly EsbocoDeEntrada[],
  prefixo: string,
  trilha: readonly string[],
): EntradaDeMenu[] =>
  esbocos.map((esboco, indice) => {
    if (esboco.tipo === 'separador') return { tipo: 'separador', id: `${prefixo}/sep-${indice}` };
    const id = `${prefixo}/${slug(esboco.rotulo)}`;
    if (esboco.tipo === 'submenu') {
      return {
        tipo: 'submenu',
        id,
        rotulo: esboco.rotulo,
        itens: montarEntradas(esboco.itens, id, [...trilha, esboco.rotulo]),
        ...(esboco.feature ? { feature: esboco.feature } : {}),
      };
    }
    return {
      tipo: 'item',
      id,
      rotulo: esboco.rotulo,
      // Sem tela ainda: a rota generica mostra onde a opcao mora e que vem ai.
      caminho: esboco.para ?? `/modulo/${id}`,
      situacao: esboco.para ? 'disponivel' : 'em-breve',
      trilha: [...trilha, esboco.rotulo],
      ...(esboco.atalho ? { atalho: lerAtalho(esboco.atalho) } : {}),
      ...(esboco.feature ? { feature: esboco.feature } : {}),
    };
  });

export const montarMenu = (rotulo: string, esbocos: readonly EsbocoDeEntrada[]): MenuPrincipal => ({
  id: slug(rotulo),
  rotulo,
  itens: montarEntradas(esbocos, slug(rotulo), [rotulo]),
});

export const itensFolha = (entradas: readonly EntradaDeMenu[]): ItemDeMenu[] =>
  entradas.flatMap((entrada) => {
    if (entrada.tipo === 'item') return [entrada];
    if (entrada.tipo === 'submenu') return itensFolha(entrada.itens);
    return [];
  });

export const todosOsItens = (menus: readonly MenuPrincipal[]): ItemDeMenu[] =>
  menus.flatMap((menu) => itensFolha(menu.itens));

export const encontrarPorCaminho = (
  menus: readonly MenuPrincipal[],
  caminho: string,
): ItemDeMenu | undefined => todosOsItens(menus).find((entrada) => entrada.caminho === caminho);

/** Tira separador duplicado, no comeco ou no fim — sobra comum quando uma flag
 *  esconde tudo que ficava entre dois deles. */
const limparSeparadores = (entradas: readonly EntradaDeMenu[]): EntradaDeMenu[] =>
  entradas.filter((entrada, indice, lista) => {
    if (entrada.tipo !== 'separador') return true;
    const temAntes = lista.slice(0, indice).some((e) => e.tipo !== 'separador');
    const temDepois = lista.slice(indice + 1).some((e) => e.tipo !== 'separador');
    return temAntes && temDepois && lista[indice - 1]?.tipo !== 'separador';
  });

const filtrarEntradas = (
  entradas: readonly EntradaDeMenu[],
  habilitado: (feature?: FeatureKey) => boolean,
): EntradaDeMenu[] =>
  limparSeparadores(
    entradas.flatMap((entrada): EntradaDeMenu[] => {
      if (entrada.tipo === 'separador') return [entrada];
      if (!habilitado(entrada.feature)) return [];
      if (entrada.tipo === 'item') return [entrada];
      const itens = filtrarEntradas(entrada.itens, habilitado);
      return itens.some((e) => e.tipo !== 'separador') ? [{ ...entrada, itens }] : [];
    }),
  );

export const filtrarPorFeature = (
  menus: readonly MenuPrincipal[],
  habilitado: (feature?: FeatureKey) => boolean,
): MenuPrincipal[] =>
  menus
    .map((menu) => ({ ...menu, itens: filtrarEntradas(menu.itens, habilitado) }))
    .filter((menu) => menu.itens.length > 0);

type EventoDeTecla = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>;

export const atalhoCorresponde = (atalho: Atalho, evento: EventoDeTecla): boolean =>
  evento.key.toLowerCase() === atalho.tecla.toLowerCase() &&
  (evento.ctrlKey || evento.metaKey) === atalho.ctrl &&
  evento.altKey === atalho.alt &&
  evento.shiftKey === atalho.shift;

/** Proxima entrada navegavel pelo teclado, pulando separador e dando a volta. */
export const proximoIndice = (
  entradas: readonly EntradaDeMenu[],
  atual: number,
  direcao: 1 | -1,
): number => {
  const total = entradas.length;
  for (let passo = 1; passo <= total; passo += 1) {
    const indice = (((atual + direcao * passo) % total) + total) % total;
    if (entradas[indice]?.tipo !== 'separador') return indice;
  }
  return atual;
};

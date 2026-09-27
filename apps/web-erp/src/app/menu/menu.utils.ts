import type { FeatureKey } from '../useTenantExperience';
import type {
  Atalho,
  EntradaDeMenu,
  EsbocoDeEntrada,
  IconeDoMenu,
  ItemDeMenu,
  MenuPrincipal,
} from './menu.types';

type OpcoesDeItem = {
  readonly para?: string;
  readonly atalho?: string;
  readonly feature?: FeatureKey;
  readonly icone?: IconeDoMenu;
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
  icone?: IconeDoMenu,
): EsbocoDeEntrada => ({
  tipo: 'submenu',
  rotulo,
  itens,
  ...(feature ? { feature } : {}),
  ...(icone ? { icone } : {}),
});

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
        ...(esboco.icone ? { icone: esboco.icone } : {}),
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
      ...(esboco.icone ? { icone: esboco.icone } : {}),
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

/** Tira acento e caixa: `"Configurações"` e `"configuracoes"` casam no type-ahead. */
export const normalizarTexto = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Primeira entrada (nao separador) cujo rotulo comeca com o texto digitado. */
export const indiceDoTypeAhead = (
  entradas: readonly EntradaDeMenu[],
  textoDigitado: string,
): number => {
  const alvo = normalizarTexto(textoDigitado);
  if (!alvo) return -1;
  return entradas.findIndex(
    (entrada) => entrada.tipo !== 'separador' && normalizarTexto(entrada.rotulo).startsWith(alvo),
  );
};

/** `mouseenter`/`mouseover` tambem disparam quando um painel aparece embaixo de
 *  um cursor parado (o layout mudou, o ponteiro nao): o navegador reavalia qual
 *  elemento esta sob o ponteiro e dispara hover sem o usuario ter mexido o
 *  mouse. `movementX/Y` deveria distinguir isso, mas nao e confiavel em toda
 *  parte (jsdom nem implementa). Guardamos a ultima posicao de verdade e so
 *  contamos como hover intencional quando a coordenada muda de fato. */
let ultimaPosicaoDoPonteiro: { readonly x: number; readonly y: number } | null = null;

export const moveuDeVerdade = (evento: {
  readonly clientX: number;
  readonly clientY: number;
}): boolean => {
  const anterior = ultimaPosicaoDoPonteiro;
  ultimaPosicaoDoPonteiro = { x: evento.clientX, y: evento.clientY };
  // Primeiro hover que este modulo ve: sem base de comparacao, deixa passar.
  if (!anterior) return true;
  return anterior.x !== evento.clientX || anterior.y !== evento.clientY;
};

export type FamiliaDeLargura = 'compacto' | 'padrao' | 'largo';

/** Largura do painel por familia, nao pelo texto mais longo de cada menu: um
 *  unico rotulo comprido (Estoque tinha um com 68 caracteres) nao pode mais
 *  esticar o menu inteiro — ele quebra em duas linhas dentro da familia `largo`. */
export const LARGURA_DO_PAINEL: Record<FamiliaDeLargura, number> = {
  compacto: 280,
  padrao: 320,
  largo: 360,
};

/** `"em breve"` (8 letras) tambem ocupa a coluna de metadado, e alguns itens
 *  tem as duas coisas ao mesmo tempo — ex.: "Cancelamento de Venda" tem atalho
 *  (Ctrl+L) e ainda nao tem tela. Contar só o atalho subestimava a largura
 *  necessaria e a linha quebrava de um jeito imprevisivel. */
const comprimentoDaEntrada = (entrada: EntradaDeMenu): number => {
  if (entrada.tipo === 'separador') return 0;
  if (entrada.tipo !== 'item') return entrada.rotulo.length;
  const doAtalho = entrada.atalho ? entrada.atalho.rotulo.length + 3 : 0;
  const doEmBreve = entrada.situacao === 'em-breve' ? 'em breve'.length + 3 : 0;
  return entrada.rotulo.length + doAtalho + doEmBreve;
};

export const familiaDoPainel = (entradas: readonly EntradaDeMenu[]): FamiliaDeLargura => {
  const maiorComprimento = entradas.reduce(
    (maior, entrada) => Math.max(maior, comprimentoDaEntrada(entrada)),
    0,
  );
  if (maiorComprimento <= 22) return 'compacto';
  if (maiorComprimento <= 34) return 'padrao';
  return 'largo';
};

/** Id do modulo de primeiro nivel dono da rota atual, para a linha de modulo
 *  ativo na barra — independente de algum menu estar aberto. */
export const moduloAtivoPara = (
  menus: readonly MenuPrincipal[],
  caminho: string,
): string | undefined =>
  menus.find((menu) => itensFolha(menu.itens).some((item) => item.caminho === caminho))?.id;

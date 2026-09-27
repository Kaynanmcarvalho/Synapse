/* eslint-disable max-lines-per-function */
import { Divider, Kbd, Spinner, Surface, Text } from '@synapse/sdl';
import { Search } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemDeMenu } from '../../app/menu/menu.types';
import { moveuDeVerdade } from '../../app/menu/menu.utils';
import { useShell } from '../../app/shell/ShellContext';
import { buscarNaNavegacao, contextoDoItem, itensComAtalho } from './menuSearch';
import { globalSearch, type SearchEntityType, type SearchResultItem } from './search.api';

const TYPE_LABEL: Record<SearchEntityType, string> = {
  seller: 'Vendedor',
  customer: 'Cliente',
  supplier: 'Fornecedor',
  product: 'Produto',
  order: 'Pedido',
  fiscalDocument: 'NF-e',
  titulo: 'Boleto/título',
};

type Resultado =
  | { readonly tipo: 'navegacao'; readonly item: ItemDeMenu }
  | { readonly tipo: 'entidade'; readonly item: SearchResultItem };

interface Grupo {
  readonly titulo: string;
  readonly resultados: readonly Resultado[];
}

const DEBOUNCE_MS = 150;

const caminhoDoResultado = (resultado: Resultado): string =>
  resultado.tipo === 'navegacao' ? resultado.item.caminho : resultado.item.path;

function LinhaDeResultado({
  id,
  resultado,
  emDestaque,
  onDestacar,
  onEscolher,
}: {
  readonly id: string;
  readonly resultado: Resultado;
  readonly emDestaque: boolean;
  readonly onDestacar: () => void;
  readonly onEscolher: () => void;
}) {
  const principal = resultado.tipo === 'navegacao' ? resultado.item.rotulo : resultado.item.title;
  const contexto =
    resultado.tipo === 'navegacao' ? contextoDoItem(resultado.item) : resultado.item.subtitle;
  const emBreve = resultado.tipo === 'navegacao' && resultado.item.situacao === 'em-breve';
  const atalho = resultado.tipo === 'navegacao' ? resultado.item.atalho?.rotulo : undefined;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus -- padrao combobox: o foco fica sempre no <input> (selecao virtual via aria-activedescendant), a opcao nunca recebe foco de verdade; Enter/teclado sao tratados no campo.
    <div
      id={id}
      role="option"
      aria-selected={emDestaque}
      onMouseMove={(evento) => {
        if (moveuDeVerdade(evento)) onDestacar();
      }}
      onClick={onEscolher}
      className={`rounded-pequeno duration-instantaneo grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2 transition-colors ${
        emDestaque ? 'bg-surface-hover' : ''
      }`}
    >
      <span className="min-w-0">
        <Text as="span" variant="corpo" className="block truncate">
          {principal}
        </Text>
        {contexto && (
          <Text as="span" variant="legenda" tone="apoio" className="block truncate">
            {contexto}
          </Text>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {emBreve && (
          <Text as="span" variant="legenda" tone="apoio">
            em breve
          </Text>
        )}
        {atalho && <Kbd>{atalho}</Kbd>}
      </span>
    </div>
  );
}

/** §59/Fase 4.1 "Command Window": um campo, tres fontes — navegacao (menu,
 *  local, instantanea), e as entidades remotas que a API ja indexa
 *  (cliente, produto, pedido, NF-e, titulo, fornecedor, vendedor). `open` e
 *  `onOpenChange` continuam controlados de fora (AppShell) porque o atalho
 *  global (Ctrl+K) precisa funcionar em qualquer tela. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { menus } = useShell();
  const inputRef = useRef<HTMLInputElement>(null);
  const elementoDeOrigem = useRef<HTMLElement | null>(null);
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [entidades, setEntidades] = useState<readonly SearchResultItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [destaque, setDestaque] = useState(0);

  // Abrir guarda quem tinha o foco (o botao do header, ou nada em especifico
  // se veio do atalho global) para devolver ao fechar — nunca solta o foco
  // num lugar imprevisivel, o mesmo cuidado da Fase 3 com a barra de menus.
  useEffect(() => {
    if (open) {
      elementoDeOrigem.current = document.activeElement as HTMLElement | null;
      setQuery('');
      setEntidades([]);
      setDestaque(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      elementoDeOrigem.current?.focus();
    }
  }, [open]);

  // Navegacao e local e instantanea (useMemo abaixo); so a busca remota
  // precisa de debounce, para nao disparar uma chamada por tecla.
  useEffect(() => {
    if (!open || !query.trim()) {
      setEntidades([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const timeout = window.setTimeout(async () => {
      try {
        const resultado = await globalSearch(query.trim());
        setEntidades(resultado.items);
      } catch {
        setEntidades([]);
      } finally {
        setCarregando(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [query, open]);

  const grupos = useMemo<Grupo[]>(() => {
    const consulta = query.trim();
    if (!consulta) {
      const atalhos = itensComAtalho(menus);
      return atalhos.length === 0
        ? []
        : [
            {
              titulo: 'Atalhos',
              resultados: atalhos.map((item) => ({ tipo: 'navegacao' as const, item })),
            },
          ];
    }

    const porTipo = new Map<SearchEntityType, SearchResultItem[]>();
    for (const item of entidades) {
      const balde = porTipo.get(item.type) ?? [];
      balde.push(item);
      porTipo.set(item.type, balde);
    }

    const resultado: Grupo[] = [];
    const navegacao = buscarNaNavegacao(menus, consulta);
    if (navegacao.length > 0) {
      resultado.push({
        titulo: 'Navegação',
        resultados: navegacao.map((item) => ({ tipo: 'navegacao' as const, item })),
      });
    }
    for (const [tipo, itens] of porTipo) {
      resultado.push({
        titulo: TYPE_LABEL[tipo],
        resultados: itens.map((item) => ({ tipo: 'entidade' as const, item })),
      });
    }
    return resultado;
  }, [query, menus, entidades]);

  // Lista linear (a mesma ordem visual, so achatada) para ArrowUp/Down,
  // Home/End e aria-activedescendant andarem por indice unico.
  const lista = useMemo(() => grupos.flatMap((grupo) => grupo.resultados), [grupos]);

  useEffect(() => {
    setDestaque(0);
  }, [lista.length, query]);

  const escolher = (resultado: Resultado) => {
    navigate(caminhoDoResultado(resultado));
    onOpenChange(false);
  };

  const idDoItem = (indice: number) => `${listboxId}-item-${indice}`;

  const onKeyDown = (evento: KeyboardEvent<HTMLInputElement>) => {
    const tratar: Record<string, () => void> = {
      Escape: () => onOpenChange(false),
      ArrowDown: () => setDestaque((atual) => Math.min(atual + 1, lista.length - 1)),
      ArrowUp: () => setDestaque((atual) => Math.max(atual - 1, 0)),
      Home: () => setDestaque(0),
      End: () => setDestaque(Math.max(lista.length - 1, 0)),
      Enter: () => {
        const alvo = lista[destaque];
        if (alvo) escolher(alvo);
      },
      // O foco fica sempre no campo (padrao combobox — a selecao e virtual,
      // via aria-activedescendant); Tab saindo pra tras do overlay seria o
      // "comportamento absurdo" que a Fase 4.1 pede pra evitar.
      Tab: () => undefined,
    };
    const acao = tratar[evento.key];
    if (!acao) return;
    evento.preventDefault();
    acao();
  };

  if (!open) return null;

  const activedescendant = lista.length > 0 ? idDoItem(destaque) : undefined;
  const mostrarVazio = grupos.length === 0 && query.trim() !== '' && !carregando;

  return (
    <div className="bg-ink/10 fixed inset-0 z-[60] flex justify-center px-4 pt-28">
      <button
        type="button"
        aria-label="Fechar busca"
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
      />
      <Surface
        variant="painel"
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="rounded-controle shadow-menu-contido relative h-fit w-full max-w-[640px] overflow-hidden"
      >
        <div className="border-hairline-light flex items-center gap-3 border-b px-4">
          <Search size={16} className="text-stone shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={lista.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={activedescendant}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(evento) => setQuery(evento.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar clientes, produtos, pedidos ou uma tela…"
            className="text-body-sm text-ink placeholder:text-ash h-12 w-full bg-transparent outline-none"
          />
          {carregando && <Spinner size={14} className="text-stone shrink-0" />}
          <Kbd className="shrink-0">Esc</Kbd>
        </div>

        <div
          id={listboxId}
          role="listbox"
          aria-label="Resultados da busca"
          className="max-h-[60vh] overflow-y-auto p-1.5"
        >
          {mostrarVazio && (
            <div className="px-3 py-6">
              <Text variant="corpoSecundario" className="block">
                Nenhum resultado para &ldquo;{query.trim()}&rdquo;.
              </Text>
              <Text variant="legenda" tone="apoio" className="mt-1 block">
                Tente buscar por cliente, produto, pedido ou uma tela.
              </Text>
            </div>
          )}
          {grupos.length === 0 && !query.trim() && (
            <Text variant="corpoSecundario" className="block px-3 py-6">
              Digite para buscar.
            </Text>
          )}
          {grupos.map((grupo, indiceDoGrupo) => (
            <div key={grupo.titulo}>
              {indiceDoGrupo > 0 && <Divider className="my-1.5" />}
              <div role="group" aria-label={grupo.titulo}>
                <Text variant="rotulo" tone="apoio" className="block px-3 py-1.5">
                  {grupo.titulo}
                </Text>
                {grupo.resultados.map((resultado) => {
                  const indiceGlobal = lista.indexOf(resultado);
                  const key =
                    resultado.tipo === 'navegacao'
                      ? `nav-${resultado.item.id}`
                      : `${resultado.item.type}-${resultado.item.id}`;
                  return (
                    <LinhaDeResultado
                      key={key}
                      id={idDoItem(indiceGlobal)}
                      resultado={resultado}
                      emDestaque={indiceGlobal === destaque}
                      onDestacar={() => setDestaque(indiceGlobal)}
                      onEscolher={() => escolher(resultado)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-hairline-light hidden items-center gap-4 border-t px-4 py-2 sm:flex">
          <span className="text-caption text-stone inline-flex items-center gap-1.5">
            <Kbd>↑↓</Kbd> Navegar
          </span>
          <span className="text-caption text-stone inline-flex items-center gap-1.5">
            <Kbd>Enter</Kbd> Abrir
          </span>
          <span className="text-caption text-stone inline-flex items-center gap-1.5">
            <Kbd>Esc</Kbd> Fechar
          </span>
        </div>

        {/* Anuncia so quando a contagem muda de verdade (depois do debounce
         *  resolver), nunca a cada tecla — irritaria mais do que ajudaria. */}
        <div aria-live="polite" className="sr-only">
          {query.trim() && !carregando
            ? `${lista.length} ${lista.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}.`
            : ''}
        </div>
      </Surface>
    </div>
  );
}

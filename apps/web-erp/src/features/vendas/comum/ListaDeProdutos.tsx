/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type { Product } from '@synapse/types';
import { LoaderCircle, Search } from 'lucide-react';
import { type KeyboardEvent as EventoDeTecla, useEffect, useRef, useState } from 'react';
import { formatarMoeda } from '../../customers/formato';
import { INPUT_DE_BUSCA, SELO, TOM } from '../../cadastros/comum/estilos';

/** A janela de produtos: F12 Produtos (busca no catálogo), Similar (mesma
 *  categoria) e Sugestão (o que o cliente mais compra). Setas escolhem, Enter
 *  lança. */

export interface ProdutoDaLista {
  readonly produto: Product;
  readonly detalhe?: string;
}

const STATUS: Readonly<Record<Product['status'], { rotulo: string; tom: keyof typeof TOM }>> = {
  active: { rotulo: 'Ativo', tom: 'positivo' },
  inactive: { rotulo: 'Inativo', tom: 'neutro' },
  blocked: { rotulo: 'Bloqueado', tom: 'perigo' },
  discontinued: { rotulo: 'Fora de linha', tom: 'alerta' },
};

export function ListaDeProdutos({
  titulo,
  descricao,
  termoInicial = '',
  comBusca = true,
  carregar,
  aoEscolher,
  aoFechar,
}: {
  readonly titulo: string;
  readonly descricao?: string;
  readonly termoInicial?: string;
  readonly comBusca?: boolean;
  readonly carregar: (termo: string) => Promise<readonly ProdutoDaLista[]>;
  readonly aoEscolher: (produto: Product) => void;
  readonly aoFechar: () => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [termo, setTermo] = useState(termoInicial);
  const [itens, setItens] = useState<readonly ProdutoDaLista[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const carregarAtual = useRef(carregar);

  useEffect(() => {
    campo.current?.focus();
    if (!comBusca) lista.current?.focus();
  }, [comBusca]);

  useEffect(() => {
    let vivo = true;
    const relogio = window.setTimeout(
      () => {
        carregarAtual
          .current(termo)
          .then((resultado) => {
            if (!vivo) return;
            setItens(resultado);
            setIndice(0);
            setErro(null);
          })
          .catch((falha: unknown) => {
            if (!vivo) return;
            setErro(falha instanceof Error ? falha.message : 'Não foi possível buscar os produtos');
            setItens([]);
          });
      },
      itens === null ? 0 : 250,
    );
    return () => {
      vivo = false;
      window.clearTimeout(relogio);
    };
    // A busca refaz só quando o termo muda; a primeira carga não espera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  useEffect(() => {
    lista.current?.querySelector(`[data-indice="${indice}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [indice]);

  const escolher = (item: ProdutoDaLista | undefined) => {
    if (item) aoEscolher(item.produto);
  };

  const navegar = (evento: EventoDeTecla) => {
    const total = itens?.length ?? 0;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndice((atual) => Math.min(total - 1, atual + 1));
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndice((atual) => Math.max(0, atual - 1));
    }
    if (evento.key === 'Enter') {
      evento.preventDefault();
      escolher(itens?.[indice]);
    }
  };

  return (
    <Modal onClose={aoFechar} title={titulo} description={descricao} size="xl">
      <div className="flex flex-col gap-3">
        {comBusca ? (
          <label className="relative block">
            <Search
              size={15}
              aria-hidden="true"
              className="text-stone pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              ref={campo}
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              onKeyDown={navegar}
              placeholder="Descrição, código, código de barras ou marca"
              aria-label="Buscar produto"
              className={`${INPUT_DE_BUSCA} pl-9`}
            />
          </label>
        ) : null}
        {erro ? <p className="text-body-sm text-[#b3242f]">{erro}</p> : null}
        {itens === null ? (
          <p className="text-body-sm text-stone flex items-center gap-2 py-6">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Buscando…
          </p>
        ) : null}
        {itens?.length === 0 && !erro ? (
          <p className="text-body-sm text-stone py-8 text-center">Nenhum produto para mostrar.</p>
        ) : null}
        {itens?.length ? (
          <ul
            ref={lista}
            role="listbox"
            aria-label={titulo}
            tabIndex={comBusca ? -1 : 0}
            onKeyDown={comBusca ? undefined : navegar}
            className="border-hairline-light max-h-[55vh] overflow-y-auto rounded-2xl border outline-none"
          >
            {itens.map((item, posicao) => {
              const status = STATUS[item.produto.status];
              return (
                <li
                  key={item.produto.id}
                  role="option"
                  aria-selected={posicao === indice}
                  data-indice={posicao}
                  onMouseEnter={() => setIndice(posicao)}
                  onClick={() => escolher(item)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') escolher(item);
                  }}
                  tabIndex={-1}
                  className={`border-hairline-light flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-0 ${
                    posicao === indice ? 'bg-[#eef0ff]' : 'bg-white'
                  }`}
                >
                  <span className="text-caption text-stone w-28 shrink-0 tabular-nums">
                    {item.produto.sku}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-body-sm text-ink block truncate font-medium">
                      {item.produto.name}
                    </span>
                    <span className="text-caption text-stone block truncate">
                      {[item.produto.logistics.unit, item.produto.brand, item.detalhe]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {item.produto.status !== 'active' ? (
                    <span className={`${SELO} ${TOM[status.tom]}`}>{status.rotulo}</span>
                  ) : null}
                  <span className="text-body-sm text-ink w-28 shrink-0 text-right font-semibold tabular-nums">
                    {formatarMoeda(Math.round(item.produto.pricing.salePrice * 100))}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
        <p className="text-caption text-stone">↑ ↓ escolhem · Enter lança · Esc fecha</p>
      </div>
    </Modal>
  );
}

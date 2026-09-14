/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type { ClienteNaLista } from '@synapse/types';
import { LoaderCircle, Search } from 'lucide-react';
import {
  type KeyboardEvent as EventoDeTecla,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { INPUT_DE_BUSCA, SELO, TOM } from '../../cadastros/comum/estilos';
import { listarClientes } from '../../customers/clientes.api';
import { formatarDocumento } from '../../customers/formato';

/** F11 Clientes (Ponto de Vendas) e F10 Informar Cliente (PDV): a busca no
 *  mesmo cadastro de clientes da retaguarda. Setas escolhem, Enter confirma. */

const SITUACAO: Readonly<
  Record<ClienteNaLista['situacao'], { rotulo: string; tom: keyof typeof TOM }>
> = {
  REGULAR: { rotulo: 'Regular', tom: 'positivo' },
  OVERDUE: { rotulo: 'Em atraso', tom: 'alerta' },
  BLOCKED: { rotulo: 'Bloqueado', tom: 'perigo' },
};

export function BuscaDeCliente({
  titulo = 'Clientes',
  aoEscolher,
  aoFechar,
  children,
}: {
  readonly titulo?: string;
  readonly aoEscolher: (cliente: ClienteNaLista) => void;
  readonly aoFechar: () => void;
  readonly children?: ReactNode;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [termo, setTermo] = useState('');
  const [itens, setItens] = useState<readonly ClienteNaLista[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);

  useEffect(() => campo.current?.focus(), []);

  useEffect(() => {
    let vivo = true;
    const relogio = window.setTimeout(() => {
      listarClientes({ termo, ativo: 'ativos', limite: 30 })
        .then((pagina) => {
          if (!vivo) return;
          setItens(pagina.itens);
          setIndice(0);
          setErro(null);
        })
        .catch((falha: unknown) => {
          if (!vivo) return;
          setErro(falha instanceof Error ? falha.message : 'Não foi possível buscar os clientes');
          setItens([]);
        });
    }, 250);
    return () => {
      vivo = false;
      window.clearTimeout(relogio);
    };
  }, [termo]);

  useEffect(() => {
    lista.current?.querySelector(`[data-indice="${indice}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [indice]);

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
      const escolhido = itens?.[indice];
      if (escolhido) aoEscolher(escolhido);
    }
  };

  return (
    <Modal onClose={aoFechar} title={titulo} size="xl">
      <div className="flex flex-col gap-3">
        {children}
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
            placeholder="Código, nome, razão social, CPF/CNPJ ou cidade"
            aria-label="Buscar cliente"
            className={`${INPUT_DE_BUSCA} pl-9`}
          />
        </label>
        {erro ? <p className="text-body-sm text-[#b3242f]">{erro}</p> : null}
        {itens === null ? (
          <p className="text-body-sm text-stone flex items-center gap-2 py-6">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Buscando…
          </p>
        ) : null}
        {itens?.length === 0 && !erro ? (
          <p className="text-body-sm text-stone py-8 text-center">Nenhum cliente encontrado.</p>
        ) : null}
        {itens?.length ? (
          <ul
            ref={lista}
            role="listbox"
            aria-label={titulo}
            className="border-hairline-light max-h-[50vh] overflow-y-auto rounded-2xl border"
          >
            {itens.map((cliente, posicao) => {
              const situacao = SITUACAO[cliente.situacao];
              return (
                <li
                  key={cliente.id}
                  role="option"
                  aria-selected={posicao === indice}
                  data-indice={posicao}
                  tabIndex={-1}
                  onMouseEnter={() => setIndice(posicao)}
                  onClick={() => aoEscolher(cliente)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') aoEscolher(cliente);
                  }}
                  className={`border-hairline-light flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-0 ${
                    posicao === indice ? 'bg-[#eef0ff]' : 'bg-white'
                  }`}
                >
                  <span className="text-caption text-stone w-20 shrink-0 tabular-nums">
                    {cliente.codigo ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-body-sm text-ink block truncate font-medium">
                      {cliente.nome}
                    </span>
                    <span className="text-caption text-stone block truncate">
                      {[
                        formatarDocumento(cliente.documento),
                        cliente.uf ? `${cliente.cidade}/${cliente.uf}` : cliente.cidade,
                        cliente.razaoSocial !== cliente.nome ? cliente.razaoSocial : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className={`${SELO} ${TOM[situacao.tom]}`}>{situacao.rotulo}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}

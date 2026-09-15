import type { PosSale } from '@synapse/types';
import { MapPin, UserRound, UtensilsCrossed } from 'lucide-react';
import { formatarDocumento } from '../../customers/formato';
import type { VendedorNaLista } from '../../funcionarios/funcionarios.api';
import { SeletorDeVendedor } from '../comum/SeletorDeVendedor';
import type { ClienteDoPdv } from './clienteDoPdv';

/** Pedido, Cliente (F10), Endereço, Vendedor e Mesa/Cartão. */
export function CabecalhoDoPdv({
  ultima,
  cliente,
  vendedor,
  mesaOuCartao,
  chaveDoVendedor,
  aoMudarVendedor,
  aoInformarCliente,
  aoInformarMesa,
}: {
  readonly ultima: PosSale | null;
  readonly cliente: ClienteDoPdv;
  readonly vendedor: VendedorNaLista | null;
  readonly mesaOuCartao: string | null;
  readonly chaveDoVendedor: string;
  readonly aoMudarVendedor: (vendedor: VendedorNaLista | null) => void;
  readonly aoInformarCliente: () => void;
  readonly aoInformarMesa: () => void;
}) {
  return (
    <section className="border-hairline-light grid gap-3 rounded-2xl border bg-white p-3 md:grid-cols-[8rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,16rem)_9rem]">
      <div>
        <p className="text-caption text-charcoal mb-1 font-medium">Pedido</p>
        <p className="border-hairline-light bg-surface-soft text-body-md text-ink flex h-11 items-center rounded-xl border px-3 tabular-nums">
          {ultima?.numero ? `Últ. ${ultima.numero}` : 'Nova'}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-caption text-charcoal mb-1 font-medium">(F10) Cliente</p>
        <button
          type="button"
          onClick={aoInformarCliente}
          className="border-hairline-light hover:border-faint flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border bg-white px-3 text-left"
        >
          <UserRound size={16} aria-hidden="true" className="text-stone shrink-0" />
          <span className="text-body-sm text-ink min-w-0 truncate">
            <strong>
              {cliente.codigo ? `${cliente.codigo} - ` : ''}
              {cliente.nome}
            </strong>
            {cliente.documento ? (
              <span className="text-stone"> · {formatarDocumento(cliente.documento)}</span>
            ) : null}
          </span>
        </button>
      </div>
      <div className="min-w-0">
        <p className="text-caption text-charcoal mb-1 font-medium">Endereço</p>
        <p className="border-hairline-light bg-surface-soft text-body-sm text-charcoal flex h-11 min-w-0 items-center gap-2 rounded-xl border px-3">
          <MapPin size={15} aria-hidden="true" className="text-stone shrink-0" />
          <span className="truncate">{cliente.endereco ?? '—'}</span>
        </p>
      </div>
      <SeletorDeVendedor
        chave={chaveDoVendedor}
        valor={vendedor}
        aoMudar={aoMudarVendedor}
        obrigatorio={false}
      />
      <div>
        <p className="text-caption text-charcoal mb-1 font-medium">(Alt+N) Mesa/Cartão</p>
        <button
          type="button"
          onClick={aoInformarMesa}
          className="border-hairline-light hover:border-faint text-body-sm flex h-11 w-full items-center gap-2 rounded-xl border bg-white px-3"
        >
          <UtensilsCrossed size={15} aria-hidden="true" className="text-stone" />
          <span className={mesaOuCartao ? 'text-ink font-semibold' : 'text-stone'}>
            {mesaOuCartao ?? 'Nenhum'}
          </span>
        </button>
      </div>
    </section>
  );
}

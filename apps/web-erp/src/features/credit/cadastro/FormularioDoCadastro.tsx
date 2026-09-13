import type { CadastroDoCliente } from '@synapse/types';
import { Save } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { CamposDoCadastro } from '../analise.api';
import { formatarDataHora } from '../analise';
import {
  documentoCompleto,
  escreverMoeda,
  lerMoeda,
  mascararCep,
  mascararDocumento,
} from './campos';
import { useCadastro } from './useCadastro';

const ENTRADA =
  'border-hairline-light text-body-sm text-ink placeholder:text-stone focus:border-hairline-strong h-10 w-full rounded-xl border bg-canvas-light px-3 outline-none transition';

type Rascunho = Record<
  | 'name'
  | 'legalName'
  | 'taxId'
  | 'stateRegistration'
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'street'
  | 'number'
  | 'complement'
  | 'district'
  | 'city'
  | 'state'
  | 'postalCode'
  | 'creditLimit',
  string
>;

const rascunhoDe = (cadastro: CadastroDoCliente): Rascunho => ({
  name: cadastro.name,
  legalName: cadastro.legalName ?? '',
  taxId: mascararDocumento(cadastro.taxId),
  stateRegistration: cadastro.stateRegistration ?? '',
  phone: cadastro.phone,
  whatsapp: cadastro.whatsapp ?? '',
  email: cadastro.email ?? '',
  street: cadastro.address.street,
  number: cadastro.address.number,
  complement: cadastro.address.complement ?? '',
  district: cadastro.address.district,
  city: cadastro.address.city,
  state: cadastro.address.state,
  postalCode: mascararCep(cadastro.address.postalCode),
  creditLimit: escreverMoeda(cadastro.creditLimit),
});

const ouNulo = (valor: string): string | null => (valor.trim() ? valor.trim() : null);

const camposDe = (rascunho: Rascunho): CamposDoCadastro => ({
  type: rascunho.taxId.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ',
  name: rascunho.name.trim(),
  legalName: ouNulo(rascunho.legalName),
  taxId: rascunho.taxId,
  stateRegistration: ouNulo(rascunho.stateRegistration),
  phone: rascunho.phone.trim(),
  whatsapp: ouNulo(rascunho.whatsapp),
  email: ouNulo(rascunho.email),
  address: {
    street: rascunho.street.trim(),
    number: rascunho.number.trim(),
    complement: ouNulo(rascunho.complement),
    district: rascunho.district.trim(),
    city: rascunho.city.trim(),
    state: rascunho.state.trim().toUpperCase().slice(0, 2),
    postalCode: rascunho.postalCode,
  },
  creditLimit: lerMoeda(rascunho.creditLimit),
});

function Secao({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <fieldset className="border-hairline-light bg-canvas-light shadow-cartao rounded-2xl border p-5">
      <legend className="text-caption text-stone px-1 font-semibold uppercase tracking-[0.08em]">
        {titulo}
      </legend>
      <div className="grid grid-cols-6 gap-3">{children}</div>
    </fieldset>
  );
}

function Entrada({
  rotulo,
  valor,
  aoMudar,
  colunas = 3,
  ...resto
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly colunas?: 1 | 2 | 3 | 4 | 6;
  readonly placeholder?: string;
  readonly inputMode?: 'numeric' | 'email' | 'tel' | 'text' | 'decimal';
}) {
  const largura = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    6: 'col-span-6',
  }[colunas];
  return (
    <label className={`${largura} flex flex-col gap-1`}>
      <span className="text-caption text-stone">{rotulo}</span>
      <input
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className={ENTRADA}
        {...resto}
      />
    </label>
  );
}

function Campos({
  rascunho,
  mudar,
}: {
  readonly rascunho: Rascunho;
  readonly mudar: (
    campo: keyof Rascunho,
    mascara?: (valor: string) => string,
  ) => (valor: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <Secao titulo="Identificação">
        <Entrada rotulo="Nome fantasia" valor={rascunho.name} aoMudar={mudar('name')} />
        <Entrada rotulo="Razão social" valor={rascunho.legalName} aoMudar={mudar('legalName')} />
        <Entrada
          rotulo="CNPJ / CPF"
          valor={rascunho.taxId}
          aoMudar={mudar('taxId', mascararDocumento)}
          inputMode="numeric"
        />
        <Entrada
          rotulo="Inscrição estadual"
          valor={rascunho.stateRegistration}
          aoMudar={mudar('stateRegistration')}
        />
      </Secao>
      <Secao titulo="Contato">
        <Entrada
          rotulo="Telefone"
          valor={rascunho.phone}
          aoMudar={mudar('phone')}
          colunas={2}
          inputMode="tel"
        />
        <Entrada
          rotulo="WhatsApp"
          valor={rascunho.whatsapp}
          aoMudar={mudar('whatsapp')}
          colunas={2}
          inputMode="tel"
        />
        <Entrada
          rotulo="E-mail"
          valor={rascunho.email}
          aoMudar={mudar('email')}
          colunas={2}
          inputMode="email"
        />
      </Secao>
      <Secao titulo="Endereço">
        <Entrada
          rotulo="CEP"
          valor={rascunho.postalCode}
          aoMudar={mudar('postalCode', mascararCep)}
          colunas={2}
          inputMode="numeric"
        />
        <Entrada rotulo="Rua" valor={rascunho.street} aoMudar={mudar('street')} colunas={3} />
        <Entrada rotulo="Número" valor={rascunho.number} aoMudar={mudar('number')} colunas={1} />
        <Entrada
          rotulo="Complemento"
          valor={rascunho.complement}
          aoMudar={mudar('complement')}
          colunas={2}
        />
        <Entrada
          rotulo="Bairro"
          valor={rascunho.district}
          aoMudar={mudar('district')}
          colunas={2}
        />
        <Entrada rotulo="Cidade" valor={rascunho.city} aoMudar={mudar('city')} colunas={1} />
        <Entrada rotulo="UF" valor={rascunho.state} aoMudar={mudar('state')} colunas={1} />
      </Secao>
      <Secao titulo="Crédito">
        <Entrada
          rotulo="Limite de crédito (R$)"
          valor={rascunho.creditLimit}
          aoMudar={mudar('creditLimit')}
          colunas={2}
          inputMode="decimal"
        />
      </Secao>
    </div>
  );
}

/** Cadastro do cliente aberto da propria analise: o analista corrige telefone,
 *  endereco ou limite sem sair da tela, e a alteracao fica assinada. */
export function FormularioDoCadastro({
  customerId,
  aoSalvar,
}: {
  readonly customerId: string;
  readonly aoSalvar: (cadastro: CadastroDoCliente) => void;
}) {
  const { estado, salvando, erroAoSalvar, salvar } = useCadastro(customerId);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);

  if (estado.status === 'carregando')
    return <p className="text-body-sm text-stone p-8 text-center">Carregando o cadastro…</p>;
  if (estado.status === 'erro')
    return <p className="text-body-sm text-accent-danger p-8 text-center">{estado.mensagem}</p>;

  const atual = rascunho ?? rascunhoDe(estado.cadastro);
  const mudar = (campo: keyof Rascunho, mascara?: (valor: string) => string) => (valor: string) =>
    setRascunho({ ...atual, [campo]: mascara ? mascara(valor) : valor });
  const podeSalvar = atual.name.trim() !== '' && documentoCompleto(atual.taxId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] p-5">
        <Campos rascunho={atual} mudar={mudar} />
      </div>
      <div className="border-hairline-light bg-canvas-light flex flex-wrap items-center gap-3 border-t px-5 py-3">
        <span className="text-caption text-stone">
          {estado.cadastro.updatedAt
            ? `Última alteração em ${formatarDataHora(estado.cadastro.updatedAt)} por ${estado.cadastro.updatedByName ?? '—'}`
            : 'Cadastro ainda não salvo'}
        </span>
        {erroAoSalvar && <span className="text-caption text-accent-danger">{erroAoSalvar}</span>}
        <button
          type="button"
          disabled={!podeSalvar || salvando}
          onClick={() =>
            void salvar(camposDe(atual)).then((salvo) => {
              if (!salvo) return;
              setRascunho(null);
              aoSalvar(salvo);
            })
          }
          className="bg-canvas-dark text-button-sm hover:bg-charcoal shadow-cartao ml-auto inline-flex h-10 items-center gap-2 rounded-full px-5 text-white transition disabled:opacity-40"
        >
          <Save size={15} aria-hidden="true" />
          {salvando ? 'Salvando…' : 'Salvar cadastro'}
        </button>
      </div>
    </div>
  );
}

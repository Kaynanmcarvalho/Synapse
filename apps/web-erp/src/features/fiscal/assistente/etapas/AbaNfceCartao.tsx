import type { NfceAcquirer, NfceSettings } from '@synapse/types';
import { isValidCnpj } from '@synapse/validation';
import { Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { formatarCnpj, soDigitos } from '../assistente.formato';
import { BOTAO_ICONE, BOTAO_SECUNDARIO, Campo, Grupo } from '../campos';
import { CodigosDaCredenciadora } from './CodigosDaCredenciadora';

type Mudar = (parcial: Partial<NfceSettings>) => void;

function NovaCredenciadora({
  aoAdicionar,
}: {
  readonly aoAdicionar: (credenciadora: NfceAcquirer) => void;
}) {
  const [razao, setRazao] = useState('');
  const [fantasia, setFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const adicionar = (evento: FormEvent) => {
    evento.preventDefault();
    if (razao.trim().length < 2) return setErro('Informe a razão social da credenciadora.');
    if (!isValidCnpj(cnpj)) return setErro('CNPJ da credenciadora inválido.');
    aoAdicionar({
      id: crypto.randomUUID(),
      legalName: razao.trim().toUpperCase(),
      tradeName: fantasia.trim().toUpperCase(),
      cnpj,
      establishmentCodes: [],
      brandCodes: [],
    });
    setRazao('');
    setFantasia('');
    setCnpj('');
    setErro(null);
  };

  return (
    <form onSubmit={adicionar} className="border-hairline-light rounded-2xl border p-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-12 sm:items-end">
        <Campo
          rotulo="Razão social"
          className="sm:col-span-5"
          value={razao}
          maxLength={120}
          onChange={(e) => setRazao(e.target.value)}
        />
        <Campo
          rotulo="Nome fantasia"
          className="sm:col-span-3"
          value={fantasia}
          maxLength={60}
          onChange={(e) => setFantasia(e.target.value)}
        />
        <Campo
          rotulo="CNPJ"
          className="sm:col-span-3"
          inputMode="numeric"
          value={formatarCnpj(cnpj)}
          onChange={(e) => setCnpj(soDigitos(e.target.value).slice(0, 14))}
        />
        <button
          type="submit"
          aria-label="Adicionar credenciadora"
          className={`${BOTAO_SECUNDARIO} px-0 sm:col-span-1`}
        >
          <Plus size={17} aria-hidden="true" />
        </button>
      </div>
      {erro && (
        <p role="alert" className="text-body-sm text-accent-danger mt-3">
          {erro}
        </p>
      )}
    </form>
  );
}

export function AbaNfceCartao({
  nfce,
  mudar,
}: {
  readonly nfce: NfceSettings;
  readonly mudar: Mudar;
}) {
  const [selecionadaId, setSelecionadaId] = useState<string | null>(nfce.acquirers[0]?.id ?? null);
  const selecionada = nfce.acquirers.find((item) => item.id === selecionadaId) ?? null;
  const trocar = (id: string, parcial: Partial<NfceAcquirer>) =>
    mudar({
      acquirers: nfce.acquirers.map((item) => (item.id === id ? { ...item, ...parcial } : item)),
    });

  return (
    <>
      <Grupo
        titulo="Rede adquirente"
        descricao="Credenciadoras de cartão informadas no pagamento da NFC-e."
      >
        <NovaCredenciadora
          aoAdicionar={(credenciadora) => {
            mudar({ acquirers: [...nfce.acquirers, credenciadora] });
            setSelecionadaId(credenciadora.id);
          }}
        />
        <ul className="border-hairline-light mt-4 divide-y divide-[#e2e2e7] rounded-2xl border">
          {nfce.acquirers.length === 0 && (
            <li className="text-body-sm text-stone px-5 py-8 text-center">
              Nenhuma credenciadora cadastrada.
            </li>
          )}
          {nfce.acquirers.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2 ${item.id === selecionadaId ? 'bg-surface-soft' : ''}`}
            >
              <button
                type="button"
                onClick={() => setSelecionadaId(item.id)}
                aria-pressed={item.id === selecionadaId}
                className="grid min-w-0 flex-1 gap-1 rounded-xl px-2 py-1.5 text-left sm:grid-cols-[1fr_180px_170px] sm:items-center"
              >
                <span className="text-body-sm text-ink truncate font-semibold">
                  {item.legalName}
                </span>
                <span className="text-body-sm text-mute truncate">{item.tradeName || '—'}</span>
                <span className="text-body-sm text-mute tabular-nums">
                  {formatarCnpj(item.cnpj)}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Remover ${item.legalName}`}
                className={BOTAO_ICONE}
                onClick={() =>
                  mudar({ acquirers: nfce.acquirers.filter((outra) => outra.id !== item.id) })
                }
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </Grupo>
      {selecionada && (
        <CodigosDaCredenciadora
          credenciadora={selecionada}
          aoMudar={(parcial) => trocar(selecionada.id, parcial)}
        />
      )}
    </>
  );
}

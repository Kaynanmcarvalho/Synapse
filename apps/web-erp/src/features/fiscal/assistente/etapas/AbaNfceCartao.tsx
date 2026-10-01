import {
  Button,
  DocInput,
  Field,
  IconButton,
  Input,
  SynapseSignal,
  TAMANHO_DE_ICONE,
  Text,
  classesDaLinha,
} from '@synapse/sdl';
import type { NfceAcquirer, NfceSettings } from '@synapse/types';
import { isValidCnpj } from '@synapse/validation';
import { Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Secao } from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { formatarCnpj, soDigitos } from '../assistente.formato';
import { CodigosDaCredenciadora } from './CodigosDaCredenciadora';

type Mudar = (parcial: Partial<NfceSettings>) => void;

/** Sub-formulário de inclusão: as mesmas validações (razão ≥ 2, CNPJ válido)
 *  e a mesma normalização (maiúsculas), sem a caixa arredondada em volta. */
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
    <form onSubmit={adicionar} noValidate aria-label="Nova credenciadora">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Field label="Razão social" className={L.resto}>
          <Input value={razao} maxLength={120} onChange={(e) => setRazao(e.target.value)} />
        </Field>
        <Field label="Nome fantasia" className={L.medio}>
          <Input value={fantasia} maxLength={60} onChange={(e) => setFantasia(e.target.value)} />
        </Field>
        <Field label="CNPJ" className={L.medio}>
          <DocInput
            value={formatarCnpj(cnpj)}
            onChange={(e) => setCnpj(soDigitos(e.target.value).slice(0, 14))}
          />
        </Field>
        <Button type="submit" variant="secondary">
          <Plus size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" /> Adicionar credenciadora
        </Button>
      </div>
      {erro && (
        <Text variant="corpo" tone="perigo" role="alert" className="mt-2">
          {erro}
        </Text>
      )}
    </form>
  );
}

/** Lista de credenciadoras com a gramática de linha do Synapse: a escolhida
 *  ganha o Synapse Signal (posição + plano), não um fundo de outra cor. */
function ListaDeCredenciadoras({
  credenciadoras,
  selecionadaId,
  aoSelecionar,
  aoRemover,
}: {
  readonly credenciadoras: readonly NfceAcquirer[];
  readonly selecionadaId: string | null;
  readonly aoSelecionar: (id: string) => void;
  readonly aoRemover: (id: string) => void;
}) {
  if (credenciadoras.length === 0)
    return (
      <Text variant="corpoSecundario" className="mt-4">
        Nenhuma credenciadora cadastrada.
      </Text>
    );
  return (
    <ul className="border-line-fina mt-4 border-t">
      {credenciadoras.map((item) => {
        const selecionada = item.id === selecionadaId;
        return (
          <li
            key={item.id}
            className={`${classesDaLinha({ selecionada, focoComAnel: false })} flex items-center gap-2 pr-1`}
          >
            <button
              type="button"
              onClick={() => aoSelecionar(item.id)}
              aria-pressed={selecionada}
              className="focus-visible:ring-primary/40 relative grid min-w-0 flex-1 gap-1 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset sm:grid-cols-[1fr_220px_180px] sm:items-center"
            >
              <SynapseSignal ativo={selecionada} />
              <Text variant="corpo" className={`truncate ${selecionada ? 'font-semibold' : ''}`}>
                {item.legalName}
              </Text>
              <Text variant="corpoSecundario" className="truncate">
                {item.tradeName || '—'}
              </Text>
              <Text variant="dado" tone="apoio">
                {formatarCnpj(item.cnpj)}
              </Text>
            </button>
            <IconButton
              label={`Remover ${item.legalName}`}
              density="compacta"
              className="hover:text-status-perigo"
              onClick={() => aoRemover(item.id)}
            >
              <Trash2 size={TAMANHO_DE_ICONE.compacta} aria-hidden="true" />
            </IconButton>
          </li>
        );
      })}
    </ul>
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
      <Secao
        titulo="Rede adquirente"
        descricao="Credenciadoras de cartão informadas no pagamento da NFC-e."
      >
        <NovaCredenciadora
          aoAdicionar={(credenciadora) => {
            mudar({ acquirers: [...nfce.acquirers, credenciadora] });
            setSelecionadaId(credenciadora.id);
          }}
        />
        <ListaDeCredenciadoras
          credenciadoras={nfce.acquirers}
          selecionadaId={selecionadaId}
          aoSelecionar={setSelecionadaId}
          aoRemover={(id) =>
            mudar({ acquirers: nfce.acquirers.filter((outra) => outra.id !== id) })
          }
        />
      </Secao>
      {selecionada && (
        <CodigosDaCredenciadora
          // A credenciadora trocou: o rascunho do código digitado não vai junto.
          key={selecionada.id}
          credenciadora={selecionada}
          aoMudar={(parcial) => trocar(selecionada.id, parcial)}
        />
      )}
    </>
  );
}

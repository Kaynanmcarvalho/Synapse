/* eslint-disable max-lines, max-lines-per-function */
import {
  Button,
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Status,
  Text,
  type TomDeStatus,
} from '@synapse/sdl';
import { useEffect, useRef, useState } from 'react';
import { CelulaDeDinheiro } from '../../components/datagrid/CelulaDeDinheiro';
import { apiRequest } from '../../lib/dev-auth';
import { formatarData, formatarMoeda } from '../customers/formato';
import { type ChargeStatus, podeBaixarManualmente, podeCancelar } from './regrasDoBoleto';

interface Account {
  id: string;
  apelido: string;
  environment: string;
}

interface Charge {
  id: string;
  amountCentavos: number;
  dueDate: string;
  status: ChargeStatus;
  installment: number;
  bank: { linhaDigitavel: string; pdfUrl: string | null } | null;
}

const ROTULO_DO_STATUS: Record<ChargeStatus, string> = {
  PENDING: 'Pendente',
  REGISTERED: 'Registrado',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
};

/** Os 5 status já encaixam nos tons que o Status do SDL já tem — pendente e
 *  vencido são literalmente o mesmo conceito usado na fila de crédito e na
 *  Home ("contas a receber vencidas"). Nenhum tom novo foi necessário. */
const TOM_DO_STATUS: Record<ChargeStatus, TomDeStatus> = {
  PENDING: 'pendente',
  REGISTERED: 'info',
  PAID: 'ok',
  OVERDUE: 'vencido',
  CANCELLED: 'neutro',
};

export function LinhaDoBoleto({
  charge,
  busy,
  aoPedirSegundaVia,
  aoIniciarBaixa,
  aoCancelar,
}: {
  readonly charge: Charge;
  readonly busy: boolean;
  readonly aoPedirSegundaVia: (charge: Charge) => void;
  readonly aoIniciarBaixa: (charge: Charge) => void;
  readonly aoCancelar: (charge: Charge) => void;
}) {
  return (
    <tr className={classesDaLinha({ clicavel: false, focoComAnel: false, hairlineNaLinha: true })}>
      <DataGridCelula papel="data" truncar={false}>
        <Text variant="dado">{charge.installment}</Text>
      </DataGridCelula>
      <DataGridCelula papel="data" truncar={false}>
        <Text variant="dado">{formatarData(charge.dueDate)}</Text>
      </DataGridCelula>
      <CelulaDeDinheiro
        truncar={false}
        peso="forte"
        valorFormatado={formatarMoeda(charge.amountCentavos)}
      />
      <DataGridCelula papel="status" truncar={false}>
        <Status tone={TOM_DO_STATUS[charge.status]}>{ROTULO_DO_STATUS[charge.status]}</Status>
      </DataGridCelula>
      <DataGridCelula papel="action" truncar={false}>
        <div className="flex items-center gap-1">
          {/* Segunda via — SECONDARY: segura, frequente, nunca muda estado. */}
          <Button
            variant="quiet"
            density="compacta"
            disabled={busy || !charge.bank}
            onClick={() => aoPedirSegundaVia(charge)}
          >
            Segunda via
          </Button>
          {/* Baixa manual — PRIMARY: a ação de negócio que move o boleto para
           *  frente (recebido). Sinalizada por cor, não por preenchimento —
           *  não deve dominar a linha. */}
          {podeBaixarManualmente(charge.status) && (
            <Button
              variant="quiet"
              density="compacta"
              className="text-primary"
              disabled={busy}
              onClick={() => aoIniciarBaixa(charge)}
            >
              Baixa manual
            </Button>
          )}
          {/* Cancelar — DESTRUCTIVE: só o tom muda (perigo só no hover/foco);
           *  a confirmação nativa já existente não foi alterada. */}
          {podeCancelar(charge.status) && (
            <Button
              variant="quiet"
              density="compacta"
              className="text-status-perigo hover:bg-status-perigo-fundo"
              disabled={busy}
              onClick={() => aoCancelar(charge)}
            >
              Cancelar
            </Button>
          )}
        </div>
      </DataGridCelula>
    </tr>
  );
}

export function BoletosScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [accountId, setAccountId] = useState('');
  const [branchId, setBranchId] = useState('matriz');
  const [customerId, setCustomerId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('1');
  const [due, setDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [interest, setInterest] = useState('0');
  const [fine, setFine] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Charge | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const requestKey = useRef({ body: '', key: crypto.randomUUID() });
  const json = (method: string, body: unknown) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const refresh = async () =>
    setCharges(
      await apiRequest<Charge[]>(`/finance/boletos?branchId=${encodeURIComponent(branchId)}`),
    );
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void run(async () => {
      setAccounts(await apiRequest<Account[]>('/finance/bank-accounts'));
      await refresh();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const issue = async () => {
    const body = {
      accountId,
      branchId,
      customerId,
      description,
      totalCentavos: Math.round(Number(amount) * 100),
      installments: Number(count),
      firstDueDate: due,
      interestPercent: Number(interest),
      finePercent: Number(fine),
      discountCentavos: Math.round(Number(discount) * 100),
      payer: { nome: payerName, documento: taxId.replace(/\D/g, '') },
    };
    const serialized = JSON.stringify(body);
    if (requestKey.current.body !== serialized)
      requestKey.current = { body: serialized, key: crypto.randomUUID() };
    await apiRequest(
      '/finance/boletos',
      json('POST', { ...body, idempotencyKey: requestKey.current.key }),
    );
    await refresh();
    setMessage('Parcelas registradas. Confira os vencimentos e as linhas digitáveis.');
  };
  const mockAccount = async () => {
    const account = await apiRequest<Account>(
      '/finance/bank-accounts',
      json('PUT', {
        id: 'sicredi-mock',
        bankId: 'SICREDI',
        environment: 'MOCK',
        apelido: 'Sicredi — simulação local',
        ativo: true,
        baseUrl: null,
      }),
    );
    setAccounts(await apiRequest<Account[]>('/finance/bank-accounts'));
    setAccountId(account.id);
    setMessage('Conta de simulação criada. Os boletos dessa conta não têm validade bancária.');
  };
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
      <h1 className="text-3xl font-bold">Boletos e parcelamentos</h1>
      <p className="text-sm">
        Emita parcelas, consulte segunda via e registre a baixa. Contas MOCK geram apenas
        simulações.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(issue);
        }}
        className="rounded-xl border bg-white p-5"
      >
        <fieldset
          disabled={busy}
          className="grid gap-3 disabled:opacity-60 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="grid gap-1 text-sm">
            Conta
            <select
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="rounded border bg-transparent p-2"
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.apelido} ({a.environment})
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ['Filial', branchId, setBranchId, 'text'],
              ['Cliente (ID)', customerId, setCustomerId, 'text'],
              ['Nome do pagador', payerName, setPayerName, 'text'],
              ['CPF/CNPJ', taxId, setTaxId, 'text'],
              ['Descrição', description, setDescription, 'text'],
              ['Total (R$)', amount, setAmount, 'number'],
              ['Parcelas', count, setCount, 'number'],
              ['Primeiro vencimento', due, setDue, 'date'],
              ['Juros mensal (%)', interest, setInterest, 'number'],
              ['Multa (%)', fine, setFine, 'number'],
              ['Desconto total (R$)', discount, setDiscount, 'number'],
            ] as const
          ).map(([label, value, setter, type]) => (
            <label key={label} className="grid gap-1 text-sm">
              {label}
              <input
                required
                type={type}
                step={type === 'number' ? '0.01' : undefined}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="min-w-0 rounded border bg-transparent p-2"
              />
            </label>
          ))}
          <button className="rounded bg-blue-600 p-2 text-white">Emitir parcelas</button>
          <button type="button" onClick={() => void run(refresh)} className="rounded border p-2">
            Consultar filial
          </button>
          <button
            type="button"
            onClick={() => void run(mockAccount)}
            className="rounded border p-2"
          >
            Configurar conta de simulação
          </button>
        </fieldset>
      </form>
      <Text variant="corpo" as="p" role="status" className="whitespace-pre-wrap">
        {busy ? 'Processando…' : message}
      </Text>
      {selected && (
        <form
          className="border-hairline-light rounded-controle flex flex-wrap items-center gap-3 border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await apiRequest(
                `/finance/boletos/${selected.id}/settle`,
                json('POST', {
                  eventId: crypto.randomUUID(),
                  amountCentavos: selected.amountCentavos,
                  note,
                }),
              );
              setSelected(null);
              await refresh();
            });
          }}
        >
          <Text variant="corpo" as="span">
            Baixa manual de {formatarMoeda(selected.amountCentavos)}
          </Text>
          <input
            required
            minLength={3}
            aria-label="Justificativa da baixa"
            placeholder="Justificativa"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border-line-fina h-controle-padrao rounded-controle text-body-sm focus:border-primary focus:ring-primary/30 border bg-transparent px-3 outline-none focus:ring-2"
          />
          <Button variant="primary" disabled={busy}>
            Confirmar recebimento
          </Button>
          <Button variant="quiet" type="button" onClick={() => setSelected(null)}>
            Voltar
          </Button>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-hairline-light bg-surface-soft border-b">
              <DataGridCabecalho id="parcela" rotulo="Parcela" />
              <DataGridCabecalho id="vencimento" rotulo="Vencimento" />
              <DataGridCabecalho id="valor" rotulo="Valor" alinhamento="direita" />
              <DataGridCabecalho id="status" rotulo="Status" />
              <DataGridCabecalho id="acoes" rotulo="Ações" />
            </tr>
          </thead>
          <tbody>
            {charges.map((charge) => (
              <LinhaDoBoleto
                key={charge.id}
                charge={charge}
                busy={busy}
                aoPedirSegundaVia={(c) =>
                  void run(async () => {
                    const bank = await apiRequest<{ linhaDigitavel: string }>(
                      `/finance/boletos/${c.id}/second-copy`,
                    );
                    setMessage(`Linha digitável: ${bank.linhaDigitavel}`);
                  })
                }
                aoIniciarBaixa={(c) => {
                  setSelected(c);
                  setNote('');
                }}
                aoCancelar={(c) => {
                  if (window.confirm('Cancelar este boleto e o título vinculado?'))
                    void run(async () => {
                      await apiRequest(`/finance/boletos/${c.id}/cancel`, { method: 'POST' });
                      await refresh();
                    });
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

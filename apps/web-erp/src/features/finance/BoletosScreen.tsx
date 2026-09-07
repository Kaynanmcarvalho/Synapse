import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/dev-auth';

interface Account {
  id: string;
  apelido: string;
  environment: string;
}
interface Charge {
  id: string;
  amountCentavos: number;
  dueDate: string;
  status: string;
  installment: number;
  bank: { linhaDigitavel: string; pdfUrl: string | null } | null;
}
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

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
        className="rounded-xl border bg-white p-5 dark:bg-slate-900"
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
      <p role="status" className="whitespace-pre-wrap text-sm">
        {busy ? 'Processando…' : message}
      </p>
      {selected && (
        <form
          className="flex flex-wrap gap-3 rounded border p-4"
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
          <p>Baixa manual de {money(selected.amountCentavos)}</p>
          <input
            required
            minLength={3}
            aria-label="Justificativa da baixa"
            placeholder="Justificativa"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded border bg-transparent p-2"
          />
          <button disabled={busy} className="rounded bg-blue-600 p-2 text-white">
            Confirmar recebimento
          </button>
          <button type="button" onClick={() => setSelected(null)}>
            Voltar
          </button>
        </form>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr>
              {['Parcela', 'Vencimento', 'Valor', 'Status', 'Ações'].map((s) => (
                <th key={s} className="p-3">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {charges.map((charge) => (
              <tr key={charge.id} className="border-t">
                <td className="p-3">{charge.installment}</td>
                <td>{charge.dueDate}</td>
                <td>{money(charge.amountCentavos)}</td>
                <td>{charge.status}</td>
                <td className="flex gap-3 p-3">
                  <button
                    disabled={busy || !charge.bank}
                    onClick={() =>
                      void run(async () => {
                        const bank = await apiRequest<{ linhaDigitavel: string }>(
                          `/finance/boletos/${charge.id}/second-copy`,
                        );
                        setMessage(`Linha digitável: ${bank.linhaDigitavel}`);
                      })
                    }
                  >
                    Segunda via
                  </button>
                  {!['PAID', 'CANCELLED', 'PENDING'].includes(charge.status) && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        setSelected(charge);
                        setNote('');
                      }}
                    >
                      Baixa manual
                    </button>
                  )}
                  {!['PAID', 'CANCELLED'].includes(charge.status) && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm('Cancelar este boleto e o título vinculado?'))
                          void run(async () => {
                            await apiRequest(`/finance/boletos/${charge.id}/cancel`, {
                              method: 'POST',
                            });
                            await refresh();
                          });
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

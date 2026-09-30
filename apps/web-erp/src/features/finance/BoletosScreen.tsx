/* eslint-disable max-lines, max-lines-per-function */
import {
  Button,
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Divider,
  DocInput,
  Field,
  Input,
  NumberInput,
  Select,
  Spinner,
  Status,
  Surface,
  Text,
  type TomDeStatus,
} from '@synapse/sdl';
import { RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dialogo } from '../../components/dialogo/Dialogo';
import { CelulaDeDinheiro } from '../../components/datagrid/CelulaDeDinheiro';
import {
  BarraDeAcoes,
  LinhaDeCampos,
  Secao,
  ValoresDeLeitura,
} from '../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO, type LarguraDeCampo } from '../../components/formulario/larguras';
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
  const campo = (
    rotulo: string,
    valor: string,
    mudar: (valor: string) => void,
    largura: LarguraDeCampo,
    tipo: 'text' | 'numero' | 'data' | 'documento' = 'text',
  ) => (
    <Field label={rotulo} className={LARGURA_DE_CAMPO[largura]}>
      {tipo === 'numero' ? (
        <NumberInput required step="0.01" value={valor} onChange={(e) => mudar(e.target.value)} />
      ) : tipo === 'documento' ? (
        <DocInput required value={valor} onValueChange={mudar} />
      ) : (
        <Input
          required
          type={tipo === 'data' ? 'date' : 'text'}
          value={valor}
          onChange={(e) => mudar(e.target.value)}
          className={tipo === 'data' ? 'font-data' : undefined}
        />
      )}
    </Field>
  );
  // Primeira carga: ainda sem nenhuma parcela e sem mensagem (run() zera
  // `message` antes de começar) — só é verdade durante o fetch inicial, não
  // durante uma ação sobre uma linha (segunda via/baixa/cancelar não limpam
  // `charges` antes de rodar). Fase 7.1 (§23): usa exatamente os mesmos
  // `busy`/`message`/`charges` de sempre, só lê os três juntos de um jeito
  // que a versão anterior não lia.
  const carregandoInicial = busy && charges.length === 0 && !message;
  const semResultadoAlgum = !busy && !message && charges.length === 0;

  return (
    <Surface
      variant="pagina"
      as="main"
      className="max-w-conteudo-trabalho mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div className="min-w-0">
          <Text variant="tituloTela">Boletos e parcelamentos</Text>
          <Text variant="corpoSecundario" className="mt-1">
            Emita parcelas, consulte segunda via e registre a baixa. Contas MOCK geram apenas
            simulações.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="quiet" disabled={busy} onClick={() => void run(mockAccount)}>
            Configurar conta de simulação
          </Button>
          <Button variant="quiet" disabled={busy} onClick={() => void run(refresh)}>
            <RotateCw size={14} aria-hidden="true" /> Consultar filial
          </Button>
        </div>
      </div>
      <Divider />

      {/* Fase 7.1 — duas colunas a partir de xl (1280px, o menor viewport
       *  exigido): emissão à esquerda, consulta à direita. Boletos tem dois
       *  trabalhos reais (emitir e consultar/agir) — empilhar um formulário
       *  de 4 seções por cima da tabela empurrava a consulta para fora do
       *  primeiro viewport e desperdiçava a largura toda em 1920/1440.
       *  Abaixo de xl, cai para uma coluna (formulário, depois consulta),
       *  igual a antes. Nenhum campo, seção ou regra de envio mudou — só
       *  onde a coluna do formulário termina. */}
      <div className="mt-6 xl:grid xl:grid-cols-[22rem_1fr] xl:items-start xl:gap-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(issue);
          }}
          aria-label="Emitir parcelas"
        >
          <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">
            <Secao titulo="Conta e filial">
              <LinhaDeCampos>
                <Field label="Conta" className={LARGURA_DE_CAMPO.longo}>
                  <Select required value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    <option value="">Selecione</option>
                    {accounts.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.apelido} ({a.environment})
                      </option>
                    ))}
                  </Select>
                </Field>
                {campo('Filial', branchId, setBranchId, 'curto')}
              </LinhaDeCampos>
            </Secao>
            <Secao titulo="Pagador">
              <LinhaDeCampos>
                {campo('Cliente (ID)', customerId, setCustomerId, 'curto')}
                {campo('Nome do pagador', payerName, setPayerName, 'resto')}
                {campo('CPF/CNPJ', taxId, setTaxId, 'medio', 'documento')}
              </LinhaDeCampos>
            </Secao>
            <Secao titulo="Cobrança">
              <LinhaDeCampos>
                {campo('Descrição', description, setDescription, 'resto')}
                {campo('Total (R$)', amount, setAmount, 'curto', 'numero')}
                {campo('Parcelas', count, setCount, 'codigo', 'numero')}
                {campo('Primeiro vencimento', due, setDue, 'curto', 'data')}
              </LinhaDeCampos>
            </Secao>
            <Secao titulo="Encargos">
              <LinhaDeCampos>
                {campo('Juros mensal (%)', interest, setInterest, 'codigo', 'numero')}
                {campo('Multa (%)', fine, setFine, 'codigo', 'numero')}
                {campo('Desconto total (R$)', discount, setDiscount, 'curto', 'numero')}
              </LinhaDeCampos>
            </Secao>
          </fieldset>
          <BarraDeAcoes>
            <Button type="submit" variant="primary" loading={busy}>
              Emitir parcelas
            </Button>
          </BarraDeAcoes>
        </form>

        <div className="mt-8 xl:mt-0">
          {/* Uma linha de situação para a coluna de consulta inteira: o
           *  mesmo `message` serve à emissão, à segunda via e à baixa (erro
           *  ou sucesso) — fica no topo desta coluna, perto da tabela que
           *  ele descreve. */}
          <Text
            variant="corpo"
            as="p"
            role="status"
            tone="apoio"
            className="min-h-5 whitespace-pre-wrap"
          >
            {busy ? 'Processando…' : message}
          </Text>

          <section className="mt-2" aria-label="Parcelas da filial">
            {carregandoInicial ? (
              <div className="flex justify-center py-14">
                <Spinner />
              </div>
            ) : (
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
                              await apiRequest(`/finance/boletos/${c.id}/cancel`, {
                                method: 'POST',
                              });
                              await refresh();
                            });
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {semResultadoAlgum ? (
              <Text variant="corpoSecundario" className="block py-6 text-center">
                Nenhuma parcela nesta filial.
              </Text>
            ) : null}
          </section>
        </div>
      </div>

      {/* Fase 7.1 — a confirmação de baixa manual vira Dialogo (mesma
       *  infraestrutura da pilha de sobreposições, Fase 6.3/6.4) em vez de
       *  uma faixa solta entre o botão de emitir e a tabela: antes, clicar
       *  "Baixa manual" numa linha lá embaixo abria um formulário lá em
       *  cima, longe da linha que o operador estava olhando. Chamada de
       *  API, validação (`required minLength={3}`), payload e atualização
       *  da lista são exatamente as de antes — só o contêiner mudou. */}
      {selected && (
        <Dialogo rotulo="Confirmar recebimento" aoFechar={() => setSelected(null)}>
          <Text variant="tituloSecao" as="h2">
            Confirmar recebimento
          </Text>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(e: React.FormEvent) => {
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
            <ValoresDeLeitura
              itens={[
                {
                  rotulo: 'Valor recebido',
                  valor: formatarMoeda(selected.amountCentavos),
                  dado: true,
                },
              ]}
            />
            <Field label="Justificativa da baixa">
              <Input
                required
                minLength={3}
                data-autofoco
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="quiet" type="button" onClick={() => setSelected(null)}>
                Voltar
              </Button>
              <Button type="submit" variant="primary" loading={busy}>
                Confirmar recebimento
              </Button>
            </div>
          </form>
        </Dialogo>
      )}
    </Surface>
  );
}

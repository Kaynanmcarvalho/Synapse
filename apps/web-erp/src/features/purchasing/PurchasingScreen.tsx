/* eslint-disable max-lines, max-lines-per-function */
import {
  Button,
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Divider,
  Field,
  Input,
  NumberInput,
  Status,
  Surface,
  SynapseSignal,
  Text,
  type TomDeStatus,
} from '@synapse/sdl';
import { Plus, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CelulaDeDinheiro } from '../../components/datagrid/CelulaDeDinheiro';
import {
  Abas,
  AreaDeTexto,
  BarraDeAcoes,
  LinhaDeCampos,
  PainelDeAba,
  Secao,
  ValoresDeLeitura,
} from '../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO } from '../../components/formulario/larguras';
import { formatarMoeda } from '../customers/formato';
import {
  addQuote,
  createPurchaseOrder,
  devSignIn,
  isSignedIn,
  listPurchaseOrders,
  receiveFromXml,
  receiveManual,
  selectSupplier,
  type PurchaseOrder,
} from './purchasing.api';

/** Compras e recebimento — piloto 1 da Form Grammar (Fase 6).
 *
 *  Só apresentação mudou. Toda chamada de API, toda validação local, o parse
 *  dos valores digitados (`Number(...)`, centavos por `* 100`) e as regras de
 *  quando cada parte aparece (status do pedido, "duas cotações para aprovar")
 *  são exatamente as de antes. */

const money = formatarMoeda;

const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  RASCUNHO: 'Rascunho',
  EM_COTACAO: 'Em cotação',
  APROVADO: 'Aprovado',
  RECEBIDO_PARCIAL: 'Recebido parcial',
  RECEBIDO: 'Recebido',
  CANCELADO: 'Cancelado',
};

/** Os 6 status do pedido de compra encaixam nos tons que o Status do SDL já
 *  tem — nenhum tom novo foi necessário (mesma decisão de Boletos). */
const TOM_DO_STATUS: Record<PurchaseOrder['status'], TomDeStatus> = {
  RASCUNHO: 'neutro',
  EM_COTACAO: 'atencao',
  APROVADO: 'info',
  RECEBIDO_PARCIAL: 'pendente',
  RECEBIDO: 'ok',
  CANCELADO: 'neutro',
};

const codigoDoPedido = (id: string) => id.slice(0, 8);

function LoginPanel({ onSignedIn }: { readonly onSignedIn: () => void }) {
  const [email, setEmail] = useState('teste.rbac@synapse.dev');
  const [password, setPassword] = useState('Senha123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await devSignIn(email, password);
      onSignedIn();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface variant="tela" as="main" className="flex min-h-screen items-center justify-center p-8">
      <Surface variant="painel" className="w-full max-w-sm p-6">
        <Text variant="tituloCartao" as="h2">
          Entrar (emulador local)
        </Text>
        <div className="mt-4 flex flex-col gap-3">
          <Field label="E-mail">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <BarraDeAcoes mensagem={error}>
            <Button variant="primary" loading={loading} onClick={submit}>
              Entrar
            </Button>
          </BarraDeAcoes>
        </div>
      </Surface>
    </Surface>
  );
}

interface ItemRow {
  productId: string;
  quantityOrdered: string;
}

/** Rótulo de coluna para linhas repetidas de campo: o rótulo visível fica uma
 *  vez só, em cima; cada controle leva o próprio `aria-label` com o número da
 *  linha, para o leitor de tela não ouvir "Produto, Produto, Produto". */
const RotuloDeColuna = ({
  children,
  className,
}: {
  readonly children: string;
  readonly className: string;
}) => (
  <Text variant="rotulo" aria-hidden="true" className={className}>
    {children}
  </Text>
);

function NewOrderForm({
  branchId,
  onCreated,
}: {
  readonly branchId: string;
  readonly onCreated: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState('wh-central');
  const [rows, setRows] = useState<ItemRow[]>([{ productId: '', quantityOrdered: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRow = (index: number, patch: Partial<ItemRow>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async () => {
    setError(null);
    const items = rows
      .filter((row) => row.productId.trim() && Number(row.quantityOrdered) > 0)
      .map((row) => ({
        productId: row.productId.trim(),
        quantityOrdered: Math.round(Number(row.quantityOrdered)),
      }));
    if (items.length === 0) {
      setError('Informe ao menos um produto com quantidade');
      return;
    }
    setSaving(true);
    try {
      await createPurchaseOrder({ branchId, warehouseId, items });
      setRows([{ productId: '', quantityOrdered: '' }]);
      onCreated();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Secao titulo="Novo pedido de compra" descricao="Itens e quantidades; o preço vem da cotação.">
      <Field label="Depósito" className={LARGURA_DE_CAMPO.curto}>
        <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
      </Field>
      <div className="mt-4 flex gap-3">
        <RotuloDeColuna className="flex-1">Produto</RotuloDeColuna>
        <RotuloDeColuna className="w-28 text-right">Quantidade</RotuloDeColuna>
      </div>
      <div className="mt-1.5 space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex gap-3">
            <Input
              aria-label={`Produto do item ${index + 1}`}
              value={row.productId}
              onChange={(event) => setRow(index, { productId: event.target.value })}
              placeholder="Código do produto"
              className="flex-1"
            />
            <NumberInput
              aria-label={`Quantidade do item ${index + 1}`}
              value={row.quantityOrdered}
              onChange={(event) => setRow(index, { quantityOrdered: event.target.value })}
              min={1}
              className="w-28"
            />
          </div>
        ))}
      </div>
      <BarraDeAcoes mensagem={error}>
        <Button
          variant="quiet"
          onClick={() => setRows((current) => [...current, { productId: '', quantityOrdered: '' }])}
        >
          <Plus size={15} aria-hidden="true" /> Adicionar item
        </Button>
        <Button variant="primary" loading={saving} onClick={submit}>
          Criar pedido
        </Button>
      </BarraDeAcoes>
    </Secao>
  );
}

interface QuoteRow {
  productId: string;
  unitCost: string;
}

function ItensDoPedido({ order }: { readonly order: PurchaseOrder }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-hairline-light border-b">
          <DataGridCabecalho id="produto" rotulo="Produto" />
          <DataGridCabecalho id="pedido" rotulo="Pedido" alinhamento="direita" />
          <DataGridCabecalho id="recebido" rotulo="Recebido" alinhamento="direita" />
          <DataGridCabecalho id="custo" rotulo="Custo" alinhamento="direita" />
        </tr>
      </thead>
      <tbody>
        {order.items.map((item) => (
          <tr
            key={item.productId}
            className={classesDaLinha({ clicavel: false, focoComAnel: false })}
          >
            <DataGridCelula papel="primary" truncar={false}>
              <Text variant="dado">{item.productId}</Text>
            </DataGridCelula>
            <DataGridCelula papel="data" alinhamento="direita" truncar={false}>
              <Text variant="dado">{item.quantityOrdered}</Text>
            </DataGridCelula>
            <DataGridCelula papel="data" alinhamento="direita" truncar={false}>
              <Text variant="dado">{item.quantityReceived}</Text>
            </DataGridCelula>
            <CelulaDeDinheiro
              truncar={false}
              peso="normal"
              valorFormatado={item.unitCostCentavos > 0 ? money(item.unitCostCentavos) : '—'}
            />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrderDetail({
  order,
  onChanged,
}: {
  readonly order: PurchaseOrder;
  readonly onChanged: () => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [leadDays, setLeadDays] = useState('5');
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>(
    order.items.map((item) => ({ productId: item.productId, unitCost: '' })),
  );
  const [receivingLines, setReceivingLines] = useState<
    Record<string, { qty: string; cost: string }>
  >({});
  const [xml, setXml] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'manual' | 'xml'>('manual');

  useEffect(() => {
    setQuoteRows(order.items.map((item) => ({ productId: item.productId, unitCost: '' })));
  }, [order.id, order.items]);

  const totals = useMemo(
    () =>
      order.quotes.map((quote) => ({
        supplierId: quote.supplierId,
        leadDays: quote.leadDays,
        total: order.items.reduce((sum, item) => {
          const q = quote.items.find((candidate) => candidate.productId === item.productId);
          return sum + (q?.unitCostCentavos ?? 0) * item.quantityOrdered;
        }, 0),
      })),
    [order],
  );

  const submitQuote = async () => {
    setError(null);
    if (!supplierId.trim()) {
      setError('Informe o id do fornecedor');
      return;
    }
    setBusy(true);
    try {
      await addQuote(order.id, {
        supplierId: supplierId.trim(),
        leadDays: Math.round(Number(leadDays)) || 1,
        items: quoteRows.map((row) => ({
          productId: row.productId,
          unitCostCentavos: Math.round(Number(row.unitCost) * 100) || 0,
        })),
      });
      setSupplierId('');
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (winnerId: string) => {
    setBusy(true);
    setError(null);
    try {
      await selectSupplier(order.id, winnerId);
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitManualReceiving = async () => {
    setBusy(true);
    setError(null);
    try {
      const lines = order.items
        .map((item) => {
          const entry = receivingLines[item.productId];
          const qty = Number(entry?.qty ?? 0);
          if (qty <= 0) return null;
          return {
            productId: item.productId,
            quantityReceived: Math.round(qty),
            unitCostReceived: Math.round(Number(entry?.cost ?? 0) * 100),
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null);
      if (lines.length === 0) {
        setError('Informe a quantidade recebida de ao menos um item');
        return;
      }
      await receiveManual(order.id, { warehouseId: order.warehouseId, lines });
      setReceivingLines({});
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitXmlReceiving = async () => {
    setBusy(true);
    setError(null);
    try {
      await receiveFromXml(order.id, order.warehouseId, xml);
      setXml('');
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const emCotacao = order.status === 'RASCUNHO' || order.status === 'EM_COTACAO';
  const emRecebimento = order.status === 'APROVADO' || order.status === 'RECEBIDO_PARCIAL';
  const idDasAbas = `recebimento-${order.id}`;

  return (
    <Surface variant="painel" as="article" aria-label={`Pedido ${codigoDoPedido(order.id)}`}>
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <Text variant="rotulo">Pedido de compra</Text>
          <Text variant="tituloSecao" as="h2" className="font-data mt-0.5">
            {codigoDoPedido(order.id)}
          </Text>
        </div>
        <Status tone={TOM_DO_STATUS[order.status]}>{STATUS_LABEL[order.status]}</Status>
      </header>
      <div className="px-5 pb-4">
        <ValoresDeLeitura
          itens={[
            { rotulo: 'Depósito', valor: order.warehouseId, dado: true },
            { rotulo: 'Fornecedor', valor: order.supplierId ?? '—', dado: true },
            { rotulo: 'Itens', valor: order.items.length, dado: true },
            { rotulo: 'Cotações', valor: order.quotes.length, dado: true },
          ]}
        />
      </div>
      <Divider />

      <div className="space-y-6 p-5">
        <Secao titulo="Itens">
          <ItensDoPedido order={order} />
        </Secao>

        {emCotacao && (
          <Secao
            titulo={`Cotações (${order.quotes.length})`}
            descricao="A mais barata primeiro. Aprovar escolhe o fornecedor do pedido."
          >
            {totals.length > 0 && (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-hairline-light border-b">
                    <DataGridCabecalho id="fornecedor" rotulo="Fornecedor" />
                    <DataGridCabecalho id="prazo" rotulo="Prazo" alinhamento="direita" />
                    <DataGridCabecalho id="total" rotulo="Total" alinhamento="direita" />
                    <DataGridCabecalho id="acao" rotulo="" />
                  </tr>
                </thead>
                <tbody>
                  {totals
                    .sort((a, b) => a.total - b.total)
                    .map((quote) => (
                      <tr
                        key={quote.supplierId}
                        className={classesDaLinha({ clicavel: false, focoComAnel: false })}
                      >
                        <DataGridCelula papel="primary" truncar={false}>
                          <Text variant="dado">{quote.supplierId}</Text>
                        </DataGridCelula>
                        <DataGridCelula papel="data" alinhamento="direita" truncar={false}>
                          <Text variant="dado">{quote.leadDays} dias</Text>
                        </DataGridCelula>
                        <CelulaDeDinheiro
                          truncar={false}
                          peso="forte"
                          valorFormatado={money(quote.total)}
                        />
                        <DataGridCelula papel="action" alinhamento="direita" truncar={false}>
                          <Button
                            variant="quiet"
                            density="compacta"
                            className="text-primary"
                            disabled={busy || order.quotes.length < 2}
                            onClick={() => approve(quote.supplierId)}
                          >
                            Aprovar
                          </Button>
                        </DataGridCelula>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
            {order.quotes.length < 2 && (
              <Text variant="corpo" tone="atencao" className="mt-2">
                Precisa de pelo menos duas cotações para aprovar (§40).
              </Text>
            )}

            <div className="border-line-fina mt-5 border-t pt-4">
              <Text variant="tituloCartao" as="h4" className="text-body-sm">
                Registrar cotação
              </Text>
              <div className="mt-3">
                <LinhaDeCampos>
                  <Field label="Fornecedor" className={LARGURA_DE_CAMPO.medio}>
                    <Input
                      value={supplierId}
                      onChange={(event) => setSupplierId(event.target.value)}
                      placeholder="Código do fornecedor"
                    />
                  </Field>
                  <Field label="Prazo de entrega (dias)" className={LARGURA_DE_CAMPO.curto}>
                    <NumberInput
                      value={leadDays}
                      onChange={(event) => setLeadDays(event.target.value)}
                    />
                  </Field>
                </LinhaDeCampos>
              </div>
              <div className="mt-4 flex gap-3">
                <RotuloDeColuna className="flex-1">Produto</RotuloDeColuna>
                <RotuloDeColuna className="w-40 text-right">Preço unitário (R$)</RotuloDeColuna>
              </div>
              <div className="mt-1.5 space-y-2">
                {quoteRows.map((row, index) => (
                  <div key={row.productId} className="flex items-center gap-3">
                    <Text variant="dado" className="min-w-0 flex-1 truncate">
                      {row.productId}
                    </Text>
                    <NumberInput
                      aria-label={`Preço unitário de ${row.productId}, em reais`}
                      step="0.01"
                      value={row.unitCost}
                      onChange={(event) =>
                        setQuoteRows((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, unitCost: event.target.value } : item,
                          ),
                        )
                      }
                      className="w-40"
                    />
                  </div>
                ))}
              </div>
              <BarraDeAcoes mensagem={error}>
                <Button variant="secondary" loading={busy} onClick={submitQuote}>
                  Enviar cotação
                </Button>
              </BarraDeAcoes>
            </div>
          </Secao>
        )}

        {emRecebimento && (
          <Secao titulo="Recebimento" descricao="Confira item a item ou importe o XML da NF-e.">
            <Abas
              idBase={idDasAbas}
              rotulo="Forma de recebimento"
              ativa={tab}
              aoMudar={setTab}
              abas={[
                { id: 'manual', rotulo: 'Conferência manual' },
                { id: 'xml', rotulo: 'Entrada por XML (DF-e)' },
              ]}
            />
            <PainelDeAba idBase={idDasAbas} ativa={tab}>
              {tab === 'manual' ? (
                <>
                  <div className="flex gap-3">
                    <RotuloDeColuna className="flex-1">Produto</RotuloDeColuna>
                    <RotuloDeColuna className="w-32 text-right">Qtd. recebida</RotuloDeColuna>
                    <RotuloDeColuna className="w-40 text-right">Custo unit. (R$)</RotuloDeColuna>
                  </div>
                  <div className="mt-1.5 space-y-2">
                    {order.items
                      .filter((item) => item.quantityReceived < item.quantityOrdered)
                      .map((item) => (
                        <div key={item.productId} className="flex items-center gap-3">
                          <span className="min-w-0 flex-1">
                            <Text variant="dado" className="block truncate">
                              {item.productId}
                            </Text>
                            <Text variant="legenda">
                              {item.quantityReceived} de {item.quantityOrdered} recebidos
                            </Text>
                          </span>
                          <NumberInput
                            aria-label={`Quantidade recebida de ${item.productId}`}
                            value={receivingLines[item.productId]?.qty ?? ''}
                            onChange={(event) =>
                              setReceivingLines((current) => ({
                                ...current,
                                [item.productId]: {
                                  ...current[item.productId],
                                  qty: event.target.value,
                                  cost: current[item.productId]?.cost ?? '',
                                },
                              }))
                            }
                            className="w-32"
                          />
                          <NumberInput
                            aria-label={`Custo unitário de ${item.productId}, em reais`}
                            step="0.01"
                            value={receivingLines[item.productId]?.cost ?? ''}
                            onChange={(event) =>
                              setReceivingLines((current) => ({
                                ...current,
                                [item.productId]: {
                                  ...current[item.productId],
                                  cost: event.target.value,
                                  qty: current[item.productId]?.qty ?? '',
                                },
                              }))
                            }
                            className="w-40"
                          />
                        </div>
                      ))}
                  </div>
                  <BarraDeAcoes mensagem={error}>
                    <Button variant="primary" loading={busy} onClick={submitManualReceiving}>
                      Confirmar recebimento
                    </Button>
                  </BarraDeAcoes>
                </>
              ) : (
                <>
                  <Field
                    label="XML da NF-e do fornecedor"
                    hint="Cole o conteúdo do arquivo. Quantidade e custo vêm da própria nota."
                  >
                    <AreaDeTexto
                      value={xml}
                      onChange={(event) => setXml(event.target.value)}
                      rows={8}
                      spellCheck={false}
                      className="font-code text-caption"
                    />
                  </Field>
                  <BarraDeAcoes mensagem={error}>
                    <Button
                      variant="primary"
                      loading={busy}
                      disabled={!xml.trim()}
                      onClick={submitXmlReceiving}
                    >
                      Importar XML e confirmar recebimento
                    </Button>
                  </BarraDeAcoes>
                </>
              )}
            </PainelDeAba>
          </Secao>
        )}

        {!emCotacao && !emRecebimento && error && (
          <Text variant="corpo" tone="perigo" role="alert">
            {error}
          </Text>
        )}
      </div>
    </Surface>
  );
}

function ListaDePedidos({
  orders,
  loading,
  selectedId,
  onSelect,
}: {
  readonly orders: readonly PurchaseOrder[];
  readonly loading: boolean;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}) {
  if (loading) return <Text variant="corpoSecundario">Carregando…</Text>;
  if (orders.length === 0)
    return <Text variant="corpoSecundario">Nenhum pedido para esta filial.</Text>;
  return (
    <ul className="border-line-fina -mx-2 border-t">
      {orders.map((order) => {
        const selecionado = selectedId === order.id;
        return (
          <li key={order.id} className="border-line-fina border-b">
            <button
              type="button"
              data-pedido={order.id}
              aria-current={selecionado || undefined}
              onClick={() => onSelect(order.id)}
              className={`${classesDaLinha({ selecionada: selecionado, hairlineNaLinha: false })} flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left`}
            >
              <SynapseSignal ativo={selecionado} />
              <span className="min-w-0">
                <Text variant="dado" className="block font-medium">
                  {codigoDoPedido(order.id)}
                </Text>
                <Text variant="legenda">{order.items.length} item(ns)</Text>
              </span>
              <Status tone={TOM_DO_STATUS[order.status]}>{STATUS_LABEL[order.status]}</Status>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PurchasingScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [branchId, setBranchId] = useState('matriz');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const items = await listPurchaseOrders(branchId.trim());
      setOrders(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setSignedIn(isSignedIn()), []);
  useEffect(() => {
    if (signedIn) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, branchId]);

  const selected = orders.find((order) => order.id === selectedId) ?? null;

  const summary = useMemo(
    () => ({
      cotacao: orders.filter((order) => order.status === 'EM_COTACAO').length,
      aprovado: orders.filter((order) => order.status === 'APROVADO').length,
      parcial: orders.filter((order) => order.status === 'RECEBIDO_PARCIAL').length,
      recebido: orders.filter((order) => order.status === 'RECEBIDO').length,
    }),
    [orders],
  );

  if (!signedIn) return <LoginPanel onSignedIn={() => setSignedIn(true)} />;

  return (
    <Surface
      variant="pagina"
      as="main"
      className="max-w-conteudo-ampla mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
        <div className="min-w-0">
          <Text variant="tituloTela">Compras e recebimento</Text>
          <Text variant="corpoSecundario" className="mt-1 max-w-3xl">
            Da cotação com mais de um fornecedor até a conferência do que chegou — manual ou por XML
            da NF-e — com custo médio e contas a pagar atualizados automaticamente.
          </Text>
        </div>
        <div className="flex items-end gap-2">
          <Field label="Filial" className={LARGURA_DE_CAMPO.curto}>
            <Input value={branchId} onChange={(event) => setBranchId(event.target.value)} />
          </Field>
          <Button variant="quiet" onClick={() => void refresh()}>
            <RotateCw size={14} aria-hidden="true" /> Atualizar
          </Button>
        </div>
      </div>
      <Divider />

      {/* Resumo em linha, não em quatro cartões: são contadores da lista ao
       *  lado, e não indicadores de painel. */}
      <dl className="flex flex-wrap gap-x-8 gap-y-2 py-4" aria-label="Pedidos por situação">
        {[
          { label: 'Em cotação', value: summary.cotacao, tone: TOM_DO_STATUS.EM_COTACAO },
          { label: 'Aprovados', value: summary.aprovado, tone: TOM_DO_STATUS.APROVADO },
          {
            label: 'Recebidos em parte',
            value: summary.parcial,
            tone: TOM_DO_STATUS.RECEBIDO_PARCIAL,
          },
          { label: 'Recebidos', value: summary.recebido, tone: TOM_DO_STATUS.RECEBIDO },
        ].map((tile) => (
          <div key={tile.label} className="flex items-baseline gap-2">
            <dt>
              <Status tone={tile.tone}>{tile.label}</Status>
            </dt>
            <dd>
              <Text variant="dado" className="text-body-md font-semibold">
                {tile.value}
              </Text>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-6" aria-label="Pedidos e novo pedido">
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <Text variant="tituloCartao" as="h2">
                Pedidos
              </Text>
              <Text variant="legenda">{orders.length}</Text>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              <ListaDePedidos
                orders={orders}
                loading={loading}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </section>
          <div className="border-line-fina border-t pt-5">
            <NewOrderForm branchId={branchId.trim()} onCreated={refresh} />
          </div>
        </aside>

        <div className="min-w-0">
          {selected ? (
            <OrderDetail order={selected} onChanged={refresh} />
          ) : (
            <Surface
              variant="afundada"
              className="flex min-h-[300px] items-center justify-center p-6 text-center"
            >
              <Text variant="corpoSecundario">
                Selecione um pedido para ver cotações e recebimento.
              </Text>
            </Surface>
          )}
        </div>
      </div>
    </Surface>
  );
}

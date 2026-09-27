/* eslint-disable max-lines-per-function */
import { classesDaLinha, DataGridCabecalho, DataGridCelula, Spinner, Text } from '@synapse/sdl';
import type { PedidoDoVendedor, ResumoDoVendedor } from '@synapse/types';
import { ChartNoAxesColumn, LoaderCircle, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CelulaDeDinheiro } from '../../../components/datagrid/CelulaDeDinheiro';
import { Bloco } from '../../customers/campos';
import { formatarMoeda } from '../../customers/formato';
import { pedidosDoFuncionario, resumoDoFuncionario } from '../funcionarios.api';

/** Abas Documentos e Relatórios: o que o funcionário vendeu, lido dos pedidos
 *  gravados — nada é digitado aqui. */

const SITUACAO: Readonly<Record<string, string>> = {
  AGUARDANDO_ANALISE: 'Aguardando análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  FATURADO: 'Faturado',
  CANCELADO: 'Cancelado',
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function Aviso({ children }: { readonly children: string }) {
  return <p className="text-body-sm text-stone py-10 text-center">{children}</p>;
}

export function AbaDocumentos({ funcionarioId }: { readonly funcionarioId: string | null }) {
  const [pedidos, setPedidos] = useState<readonly PedidoDoVendedor[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!funcionarioId) return undefined;
    pedidosDoFuncionario(funcionarioId)
      .then((lista) => ativo && setPedidos(lista))
      .catch(
        (falha: unknown) =>
          ativo && setErro(falha instanceof Error ? falha.message : 'Falha ao carregar'),
      );
    return () => {
      ativo = false;
    };
  }, [funcionarioId]);

  if (!funcionarioId) return <Aviso>Salve o cadastro para ver os pedidos deste funcionário.</Aviso>;
  return (
    <Bloco
      titulo="Pedidos como vendedor"
      icone={ReceiptText}
      descricao="Ponto de Vendas, PDV e app do vendedor"
    >
      {erro ? <p className="text-body-sm text-status-perigo">{erro}</p> : null}
      {!erro && pedidos === null ? (
        <p className="text-body-sm text-stone flex items-center gap-2">
          <Spinner size={15} decorative /> Carregando…
        </p>
      ) : null}
      {pedidos?.length === 0 ? (
        <p className="text-body-sm text-stone">Nenhum pedido ainda.</p>
      ) : null}
      {pedidos?.length ? (
        <div className="overflow-x-auto">
          {/* Só leitura: nenhuma linha abre o pedido nem tem ação. */}
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-hairline-light border-b">
                <DataGridCabecalho id="numero" rotulo="Nº" />
                <DataGridCabecalho id="data" rotulo="Data" />
                <DataGridCabecalho id="cliente" rotulo="Cliente" />
                <DataGridCabecalho id="tipo" rotulo="Tipo" />
                <DataGridCabecalho id="situacao" rotulo="Situação" />
                <DataGridCabecalho id="total" rotulo="Total" alinhamento="direita" />
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr
                  key={pedido.id}
                  className={classesDaLinha({ clicavel: false, focoComAnel: false })}
                >
                  <DataGridCelula papel="data" truncar={false}>
                    <Text variant="dado" className="font-medium">
                      {pedido.numero}
                    </Text>
                  </DataGridCelula>
                  <DataGridCelula papel="data" truncar={false}>
                    <Text variant="dado">{dataHora(pedido.enviadoEm)}</Text>
                  </DataGridCelula>
                  <DataGridCelula papel="primary" truncar={false}>
                    <Text variant="corpo">{pedido.clienteNome}</Text>
                  </DataGridCelula>
                  <DataGridCelula papel="secondary" truncar={false}>
                    <Text variant="corpoSecundario">{pedido.tipo}</Text>
                  </DataGridCelula>
                  <DataGridCelula papel="secondary" truncar={false}>
                    <Text variant="corpoSecundario">
                      {SITUACAO[pedido.situacao] ?? pedido.situacao}
                    </Text>
                  </DataGridCelula>
                  <CelulaDeDinheiro
                    truncar={false}
                    valorFormatado={formatarMoeda(pedido.totalCentavos)}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Bloco>
  );
}

function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly detalhe?: string;
}) {
  return (
    <div className="border-hairline-light rounded-2xl border bg-white p-4">
      <p className="text-caption text-stone">{rotulo}</p>
      <p className="font-display text-heading-sm text-ink mt-1 tabular-nums">{valor}</p>
      {detalhe ? <p className="text-caption text-stone mt-0.5">{detalhe}</p> : null}
    </div>
  );
}

export function AbaRelatorios({ funcionarioId }: { readonly funcionarioId: string | null }) {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [resumo, setResumo] = useState<ResumoDoVendedor | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!funcionarioId) return undefined;
    setResumo(null);
    setErro(null);
    resumoDoFuncionario(funcionarioId, mes)
      .then((valor) => ativo && setResumo(valor))
      .catch(
        (falha: unknown) =>
          ativo && setErro(falha instanceof Error ? falha.message : 'Falha ao carregar'),
      );
    return () => {
      ativo = false;
    };
  }, [funcionarioId, mes]);

  if (!funcionarioId) return <Aviso>Salve o cadastro para ver o resumo de vendas.</Aviso>;
  return (
    <Bloco
      titulo="Vendas do mês"
      icone={ChartNoAxesColumn}
      descricao="Pedidos cancelados e reprovados não contam"
      acao={
        <input
          type="month"
          value={mes}
          onChange={(evento) => setMes(evento.target.value)}
          aria-label="Mês"
          className="border-hairline-light text-body-sm h-9 rounded-xl border bg-white px-3"
        />
      }
    >
      {erro ? <p className="text-body-sm text-[#b3242f]">{erro}</p> : null}
      {!erro && !resumo ? (
        <p className="text-body-sm text-stone flex items-center gap-2">
          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
        </p>
      ) : null}
      {resumo ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              rotulo="Vendido"
              valor={formatarMoeda(resumo.vendidoCentavos)}
              detalhe={`${resumo.pedidos} pedido(s)`}
            />
            <Indicador rotulo="Faturado" valor={formatarMoeda(resumo.faturadoCentavos)} />
            <Indicador
              rotulo="Ticket médio"
              valor={formatarMoeda(resumo.ticketMedioCentavos)}
              detalhe={`${resumo.clientesAtendidos} cliente(s)`}
            />
            <Indicador
              rotulo="Comissão prevista"
              valor={formatarMoeda(resumo.comissaoPrevistaCentavos)}
            />
          </div>
          {resumo.metaMensalCentavos > 0 ? (
            <div className="mt-4">
              <div className="text-caption text-stone mb-1 flex justify-between">
                <span>Meta {formatarMoeda(resumo.metaMensalCentavos)}</span>
                <span className="tabular-nums">{resumo.percentualDaMeta}%</span>
              </div>
              <div className="bg-surface-soft h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${Math.min(100, resumo.percentualDaMeta)}%` }}
                />
              </div>
            </div>
          ) : null}
          {resumo.porSituacao.length ? (
            <ul className="text-body-sm text-charcoal mt-4 flex flex-wrap gap-2">
              {resumo.porSituacao.map((linha) => (
                <li key={linha.situacao} className="bg-surface-soft rounded-full px-3 py-1">
                  {SITUACAO[linha.situacao] ?? linha.situacao}: {linha.quantidade}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </Bloco>
  );
}

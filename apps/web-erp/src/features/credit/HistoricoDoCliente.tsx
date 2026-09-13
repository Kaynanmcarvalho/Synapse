import type { NotaDoCliente, PedidoDeVenda } from '@synapse/types';
import { Cartao, Vazio } from './Cartao';
import { BotaoLupa, Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from './Tabela';
import { formatarData, formatarMoeda, ROTULO_DA_SITUACAO } from './analise';
import { documentoDaNota, documentoDoPedido, type Documento } from './documentos/navegacao';
import { pagamentoDoPedido } from './fila/filtros';

export type AbaDoHistorico = 'pedidos' | 'notas';

const COLUNAS_DE_PEDIDO: readonly ColunaDaTabela[] = [
  { rotulo: 'Pedido' },
  { rotulo: 'Data', alinhamento: 'centro' },
  { rotulo: 'Condição' },
  { rotulo: 'Situação' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: '', alinhamento: 'centro', largura: '48px' },
];

const COLUNAS_DE_NOTA: readonly ColunaDaTabela[] = [
  { rotulo: 'NF' },
  { rotulo: 'Emissão', alinhamento: 'centro' },
  { rotulo: 'Pedido', alinhamento: 'centro' },
  { rotulo: 'Situação' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: '', alinhamento: 'centro', largura: '48px' },
];

const em = (colunas: readonly ColunaDaTabela[], indice: number): ColunaDaTabela =>
  colunas[indice] ?? { rotulo: '' };

function Chave({
  aba,
  onTrocar,
}: {
  readonly aba: AbaDoHistorico;
  readonly onTrocar: (aba: AbaDoHistorico) => void;
}) {
  const opcoes: ReadonlyArray<{ readonly id: AbaDoHistorico; readonly rotulo: string }> = [
    { id: 'pedidos', rotulo: 'Últimos pedidos' },
    { id: 'notas', rotulo: 'Últimas NFs' },
  ];
  return (
    <span
      role="tablist"
      aria-label="Histórico do cliente"
      className="bg-surface-soft flex rounded-full p-1"
    >
      {opcoes.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          role="tab"
          aria-selected={aba === opcao.id}
          onClick={() => onTrocar(opcao.id)}
          className={`text-button-sm rounded-full px-3.5 py-1.5 transition duration-200 ${
            aba === opcao.id
              ? 'bg-canvas-light text-ink shadow-cartao'
              : 'text-charcoal hover:text-ink'
          }`}
        >
          {opcao.rotulo}
        </button>
      ))}
    </span>
  );
}

function TabelaDePedidos({
  pedidos,
  aoAbrir,
}: {
  readonly pedidos: readonly PedidoDeVenda[];
  readonly aoAbrir: (documento: Documento) => void;
}) {
  if (pedidos.length === 0) return <Vazio texto="Nenhum pedido registrado para este cliente." />;
  return (
    <Tabela colunas={COLUNAS_DE_PEDIDO} larguraMinima={500}>
      {pedidos.map((pedido) => (
        <LinhaDaTabela key={pedido.id}>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 0)} forte>
            {pedido.numero}
          </Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 1)}>{formatarData(pedido.enviadoEm)}</Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 2)}>{pagamentoDoPedido(pedido)}</Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 3)}>{ROTULO_DA_SITUACAO[pedido.situacao]}</Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 4)} forte>
            {formatarMoeda(pedido.totalCentavos)}
          </Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 5)}>
            <BotaoLupa
              rotulo={`Abrir o pedido ${pedido.numero}`}
              aoAbrir={() => aoAbrir(documentoDoPedido(pedido))}
            />
          </Celula>
        </LinhaDaTabela>
      ))}
    </Tabela>
  );
}

function TabelaDeNotas({
  notas,
  aoAbrir,
}: {
  readonly notas: readonly NotaDoCliente[];
  readonly aoAbrir: (documento: Documento) => void;
}) {
  if (notas.length === 0) return <Vazio texto="Nenhuma nota emitida para este cliente." />;
  return (
    <Tabela colunas={COLUNAS_DE_NOTA} larguraMinima={500}>
      {notas.map((nota) => (
        <LinhaDaTabela key={`${nota.serie}-${nota.numero}`}>
          <Celula coluna={em(COLUNAS_DE_NOTA, 0)} forte>
            {nota.numero}
            <span className="text-stone font-normal"> · s{nota.serie}</span>
          </Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 1)}>{formatarData(nota.emitidaEm)}</Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 2)}>{nota.pedidoNumero ?? '—'}</Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 3)}>
            {nota.pedidoSituacao === 'CANCELADO' ? (
              <span className="font-semibold text-[#b3242f]">Pedido cancelado</span>
            ) : (
              'Emitida'
            )}
          </Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 4)} forte>
            {formatarMoeda(nota.totalCentavos)}
          </Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 5)}>
            <BotaoLupa
              rotulo={`Abrir a NF ${nota.numero}`}
              aoAbrir={() => aoAbrir(documentoDaNota(nota))}
            />
          </Celula>
        </LinhaDaTabela>
      ))}
    </Tabela>
  );
}

/** Canto superior direito: o que o cliente vem comprando, visto como pedido ou
 *  como nota. Cada lupa abre o documento do seu tipo — pedido abre o pedido,
 *  NF abre a nota —, e nunca a analise de credito. */
export function HistoricoDoCliente({
  aba,
  onTrocarAba,
  pedidos,
  notas,
  aoAbrirDocumento,
}: {
  readonly aba: AbaDoHistorico;
  readonly onTrocarAba: (aba: AbaDoHistorico) => void;
  readonly pedidos: readonly PedidoDeVenda[];
  readonly notas: readonly NotaDoCliente[];
  readonly aoAbrirDocumento: (documento: Documento) => void;
}) {
  return (
    <Cartao
      titulo={aba === 'pedidos' ? 'Últimos pedidos' : 'Últimas notas fiscais'}
      acao={<Chave aba={aba} onTrocar={onTrocarAba} />}
    >
      <div role="tabpanel">
        {aba === 'pedidos' ? (
          <TabelaDePedidos pedidos={pedidos} aoAbrir={aoAbrirDocumento} />
        ) : (
          <TabelaDeNotas notas={notas} aoAbrir={aoAbrirDocumento} />
        )}
      </div>
    </Cartao>
  );
}

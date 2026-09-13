import type { NotaDoCliente, PedidoDeVenda } from '@synapse/types';
import { Cartao, Vazio } from './Cartao';
import { BotaoLupa, Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from './Tabela';
import { formatarData, formatarMoeda, ROTULO_DA_SITUACAO, ROTULO_DO_TIPO } from './analise';

export type AbaDoHistorico = 'pedidos' | 'notas';

const COLUNAS_DE_PEDIDO: readonly ColunaDaTabela[] = [
  { rotulo: 'Pedido' },
  { rotulo: 'Data', alinhamento: 'centro' },
  { rotulo: 'Tipo' },
  { rotulo: 'Situação' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: '', alinhamento: 'centro', largura: '48px' },
];

const COLUNAS_DE_NOTA: readonly ColunaDaTabela[] = [
  { rotulo: 'NF' },
  { rotulo: 'Série', alinhamento: 'centro', largura: '64px' },
  { rotulo: 'Emissão', alinhamento: 'centro' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: '', alinhamento: 'centro', largura: '48px' },
];

const em = (colunas: readonly ColunaDaTabela[], indice: number): ColunaDaTabela =>
  colunas[indice] ?? { rotulo: '' };

/** Canto superior direito: o historico do cliente. Pedidos e notas dividem o
 *  mesmo espaco — sao a mesma pergunta ("o que esse cliente vem comprando?")
 *  vista de dois lados, e a chave troca sem tirar nada do lugar. */
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
  aoAbrirPedido,
}: {
  readonly pedidos: readonly PedidoDeVenda[];
  readonly aoAbrirPedido: (pedidoId: string) => void;
}) {
  if (pedidos.length === 0) return <Vazio texto="Nenhum pedido registrado para este cliente." />;
  return (
    <Tabela colunas={COLUNAS_DE_PEDIDO} larguraMinima={460}>
      {pedidos.map((pedido) => (
        <LinhaDaTabela key={pedido.id}>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 0)} forte>
            {pedido.numero}
          </Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 1)}>{formatarData(pedido.enviadoEm)}</Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 2)}>{ROTULO_DO_TIPO[pedido.tipo]}</Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 3)}>{ROTULO_DA_SITUACAO[pedido.situacao]}</Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 4)} forte>
            {formatarMoeda(pedido.totalCentavos)}
          </Celula>
          <Celula coluna={em(COLUNAS_DE_PEDIDO, 5)}>
            <BotaoLupa
              rotulo={`Abrir o pedido ${pedido.numero}`}
              aoAbrir={() => aoAbrirPedido(pedido.id)}
            />
          </Celula>
        </LinhaDaTabela>
      ))}
    </Tabela>
  );
}

function TabelaDeNotas({
  notas,
  aoAbrirPedido,
}: {
  readonly notas: readonly NotaDoCliente[];
  readonly aoAbrirPedido: (pedidoId: string) => void;
}) {
  if (notas.length === 0) return <Vazio texto="Nenhuma nota emitida para este cliente." />;
  return (
    <Tabela colunas={COLUNAS_DE_NOTA} larguraMinima={400}>
      {notas.map((nota) => (
        <LinhaDaTabela key={`${nota.serie}-${nota.numero}`}>
          <Celula coluna={em(COLUNAS_DE_NOTA, 0)} forte>
            {nota.numero}
          </Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 1)}>{nota.serie}</Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 2)}>{formatarData(nota.emitidaEm)}</Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 3)} forte>
            {formatarMoeda(nota.totalCentavos)}
          </Celula>
          <Celula coluna={em(COLUNAS_DE_NOTA, 4)}>
            <BotaoLupa
              rotulo={`Abrir o pedido da NF ${nota.numero}`}
              aoAbrir={() => aoAbrirPedido(nota.pedidoId)}
            />
          </Celula>
        </LinhaDaTabela>
      ))}
    </Tabela>
  );
}

export function HistoricoDoCliente({
  aba,
  onTrocarAba,
  pedidos,
  notas,
  aoAbrirPedido,
}: {
  readonly aba: AbaDoHistorico;
  readonly onTrocarAba: (aba: AbaDoHistorico) => void;
  readonly pedidos: readonly PedidoDeVenda[];
  readonly notas: readonly NotaDoCliente[];
  readonly aoAbrirPedido: (pedidoId: string) => void;
}) {
  return (
    <Cartao
      titulo={aba === 'pedidos' ? 'Últimos pedidos' : 'Últimas notas fiscais'}
      acao={<Chave aba={aba} onTrocar={onTrocarAba} />}
    >
      <div role="tabpanel">
        {aba === 'pedidos' ? (
          <TabelaDePedidos pedidos={pedidos} aoAbrirPedido={aoAbrirPedido} />
        ) : (
          <TabelaDeNotas notas={notas} aoAbrirPedido={aoAbrirPedido} />
        )}
      </div>
    </Cartao>
  );
}

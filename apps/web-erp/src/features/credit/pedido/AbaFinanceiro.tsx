import type { CarteiraDoCliente, PedidoDeVenda } from '@synapse/types';
import { CalendarClock } from 'lucide-react';
import { Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from '../Tabela';
import { descricaoDoAtraso, formatarData, formatarDataHora, formatarMoeda } from '../analise';
import { Bloco, Campo, Grade } from './Bloco';
import { parcelasDoPedido, semCobranca, type Parcela } from './parcelas';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Parcela', alinhamento: 'centro', largura: '80px' },
  { rotulo: 'Vencimento', alinhamento: 'centro' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: 'Situação', alinhamento: 'direita' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

interface TituloDoPedido {
  readonly chave: string;
  readonly parcela: string;
  readonly vencimento: string;
  readonly valorCentavos: number;
  readonly situacao: string;
  readonly alerta: boolean;
}

/** Os titulos que este pedido ja gerou — os abertos e os pagos — lidos da
 *  carteira do cliente que a ficha ja carregou. */
const titulosDoPedido = (pedido: PedidoDeVenda, carteira: CarteiraDoCliente): TituloDoPedido[] => [
  ...carteira.titulosEmAberto
    .filter((titulo) => titulo.pedidoId === pedido.id)
    .map((titulo) => ({
      chave: titulo.id,
      parcela: titulo.parcela,
      vencimento: titulo.vencimento,
      valorCentavos: titulo.saldoCentavos,
      situacao: descricaoDoAtraso(titulo.diasDeAtraso),
      alerta: titulo.diasDeAtraso > 0,
    })),
  ...carteira.pagamentos
    .filter((pagamento) => pagamento.pedidoId === pedido.id)
    .map((pagamento, indice) => ({
      chave: `${pagamento.tituloId}-${indice}`,
      parcela: pagamento.parcela,
      vencimento: pagamento.vencimento,
      valorCentavos: pagamento.valorCentavos,
      situacao: `Pago em ${formatarData(pagamento.pagoEm)}`,
      alerta: false,
    })),
];

function BlocoDaNota({ pedido }: { readonly pedido: PedidoDeVenda }) {
  return (
    <Bloco titulo="Nota fiscal">
      {pedido.nota ? (
        <Grade>
          <Campo rotulo="Número">{pedido.nota.numero}</Campo>
          <Campo rotulo="Série">{pedido.nota.serie}</Campo>
          <Campo rotulo="Emissão">{formatarDataHora(pedido.nota.emitidaEm)}</Campo>
          <Campo rotulo="Chave de acesso" largo>
            <span className="text-body-sm break-all tabular-nums">
              {pedido.nota.chaveDeAcesso ?? 'Ainda não informada'}
            </span>
          </Campo>
        </Grade>
      ) : (
        <p className="text-body-sm text-mute">
          Ainda não faturado — a nota aparece aqui depois do faturamento.
        </p>
      )}
    </Bloco>
  );
}

function TabelaDeTitulos({ titulos }: { readonly titulos: readonly TituloDoPedido[] }) {
  if (titulos.length === 0)
    return <p className="text-body-sm text-mute">Nenhum título ligado a este pedido.</p>;
  return (
    <Tabela colunas={COLUNAS} larguraMinima={420}>
      {titulos.map((titulo) => (
        <LinhaDaTabela key={titulo.chave} destaque={titulo.alerta}>
          <Celula coluna={coluna(0)}>{titulo.parcela}</Celula>
          <Celula coluna={coluna(1)}>{formatarData(titulo.vencimento)}</Celula>
          <Celula coluna={coluna(2)} forte>
            {formatarMoeda(titulo.valorCentavos)}
          </Celula>
          <Celula coluna={coluna(3)}>
            <span className={titulo.alerta ? 'text-accent-danger font-semibold' : ''}>
              {titulo.situacao}
            </span>
          </Celula>
        </LinhaDaTabela>
      ))}
    </Tabela>
  );
}

function TabelaDePrevistas({ parcelas }: { readonly parcelas: readonly Parcela[] }) {
  if (parcelas.length === 0)
    return <p className="text-body-sm text-mute">Sem cobrança: este pedido não gera parcelas.</p>;
  return (
    <Tabela colunas={COLUNAS} larguraMinima={420}>
      {parcelas.map((parcela) => (
        <LinhaDaTabela key={parcela.numero}>
          <Celula coluna={coluna(0)}>
            {parcela.numero}/{parcelas.length}
          </Celula>
          <Celula coluna={coluna(1)}>{formatarData(parcela.vencimento)}</Celula>
          <Celula coluna={coluna(2)} forte>
            {formatarMoeda(parcela.valorCentavos)}
          </Celula>
          <Celula coluna={coluna(3)}>
            {parcela.dias === 0 ? 'À vista' : `${parcela.dias} dias`}
          </Celula>
        </LinhaDaTabela>
      ))}
    </Tabela>
  );
}

/** Aba financeira: a nota, os titulos que o pedido gerou e — antes de faturar —
 *  as parcelas previstas, com o atalho para o calendario comparativo. */
export function AbaFinanceiro({
  pedido,
  carteira,
  aoVerParcelas,
}: {
  readonly pedido: PedidoDeVenda;
  readonly carteira: CarteiraDoCliente | null;
  readonly aoVerParcelas: () => void;
}) {
  const faturado = pedido.nota !== null;
  const podeComparar = !faturado && !semCobranca(pedido);

  return (
    <div className="grid gap-4">
      <BlocoDaNota pedido={pedido} />
      <Bloco
        titulo={faturado ? 'Títulos gerados pelo pedido' : 'Parcelas previstas'}
        acao={
          podeComparar ? (
            <button
              type="button"
              onClick={aoVerParcelas}
              className="bg-surface-soft text-button-sm text-ink inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 transition hover:bg-[#ececee]"
            >
              <CalendarClock size={14} aria-hidden="true" /> Comparar com o histórico
            </button>
          ) : undefined
        }
      >
        {faturado ? (
          <TabelaDeTitulos titulos={carteira ? titulosDoPedido(pedido, carteira) : []} />
        ) : (
          <TabelaDePrevistas parcelas={parcelasDoPedido(pedido, new Date())} />
        )}
      </Bloco>
    </div>
  );
}

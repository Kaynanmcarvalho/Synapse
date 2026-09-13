import type { CarteiraDoCliente, PedidoDeVenda } from '@synapse/types';
import { Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from '../Tabela';
import { formatarMoeda } from '../analise';
import {
  descricaoDoParcelamento,
  diferencaParaMedia,
  parcelasDoPedido,
  referenciasDoCliente,
  vencimentosDoPedido,
} from './parcelas';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Nº', alinhamento: 'centro', largura: '52px' },
  { rotulo: 'Prazo', alinhamento: 'centro' },
  { rotulo: 'Vencimento', alinhamento: 'centro' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: 'x Média paga', alinhamento: 'direita' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

const DIA_DA_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

const dataDe = (iso: string): Date => {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano ?? 0, (mes ?? 1) - 1, dia ?? 1);
};

const vencimentoPorExtenso = (iso: string): string => {
  const data = dataDe(iso);
  const dia = `${data.getDate()}`.padStart(2, '0');
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  return `${DIA_DA_SEMANA.format(data).replace('.', '')}, ${dia}/${mes}/${data.getFullYear()}`;
};

/** Boleto que vence no sabado ou no domingo so e pago no dia util seguinte: vale
 *  avisar, porque muda o dia em que o dinheiro entra. */
const caiNoFimDeSemana = (iso: string): boolean => [0, 6].includes(dataDe(iso).getDay());

function Vencimento({ iso }: { readonly iso: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {vencimentoPorExtenso(iso)}
      {caiNoFimDeSemana(iso) && (
        <span
          title="Vence no fim de semana: o pagamento cai no próximo dia útil"
          className="text-caption bg-accent-warning/10 text-accent-warning rounded-full px-2 py-0.5 font-semibold"
        >
          fim de semana
        </span>
      )}
    </span>
  );
}

/** Ate 10% acima da media e confortavel; ate 35%, pede atencao; acima, pesa. */
function Comparacao({ diferenca }: { readonly diferenca: number | null }) {
  if (diferenca === null) return <span className="text-stone">—</span>;
  const tom =
    diferenca <= 10
      ? 'bg-accent-teal/10 text-accent-teal'
      : diferenca <= 35
        ? 'bg-accent-warning/10 text-accent-warning'
        : 'bg-accent-danger/10 text-accent-danger';
  return (
    <span className={`text-caption inline-flex rounded-full px-2 py-0.5 font-semibold ${tom}`}>
      {diferenca > 0 ? `+${diferenca}%` : `${diferenca}%`}
    </span>
  );
}

function Referencia({ rotulo, valor }: { readonly rotulo: string; readonly valor: number | null }) {
  return (
    <span className="border-hairline-light bg-canvas-light shadow-cartao flex flex-col rounded-xl border px-4 py-2.5">
      <span className="text-caption text-stone">{rotulo}</span>
      <strong className="text-body-md text-ink font-semibold tabular-nums">
        {valor === null ? 'Sem histórico' : formatarMoeda(valor)}
      </strong>
    </span>
  );
}

/** Janela pequena do prazo: em que dia cai cada parcela, contando de hoje, e
 *  quanto vale — lado a lado com o que o cliente costuma pagar e o que ja deve
 *  por parcela. */
export function ConteudoDasParcelas({
  pedido,
  carteira,
}: {
  readonly pedido: PedidoDeVenda;
  readonly carteira: CarteiraDoCliente | null;
}) {
  const parcelas = parcelasDoPedido(pedido, new Date());
  const referencias = carteira
    ? referenciasDoCliente(carteira)
    : { mediaPagaCentavos: null, mediaEmAbertoCentavos: null };

  return (
    <div className="grid gap-4 p-5">
      <p className="text-body-sm text-mute">
        Pedido {pedido.numero} · {pedido.formaDePagamento}{' '}
        <strong className="text-ink">{descricaoDoParcelamento(vencimentosDoPedido(pedido))}</strong>{' '}
        · contando a partir de hoje
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Referencia rotulo="Média das parcelas pagas" valor={referencias.mediaPagaCentavos} />
        <Referencia
          rotulo="Média das parcelas em aberto"
          valor={referencias.mediaEmAbertoCentavos}
        />
      </div>

      {parcelas.length === 0 ? (
        <p className="text-body-sm text-stone py-4 text-center">
          Sem cobrança: este pedido não gera parcelas.
        </p>
      ) : (
        <Tabela colunas={COLUNAS} larguraMinima={440}>
          {parcelas.map((parcela) => (
            <LinhaDaTabela key={parcela.numero}>
              <Celula coluna={coluna(0)} forte>
                {parcela.numero}
              </Celula>
              <Celula coluna={coluna(1)}>
                {parcela.dias === 0 ? 'À vista' : `${parcela.dias} dias`}
              </Celula>
              <Celula coluna={coluna(2)}>
                <Vencimento iso={parcela.vencimento} />
              </Celula>
              <Celula coluna={coluna(3)} forte>
                {formatarMoeda(parcela.valorCentavos)}
              </Celula>
              <Celula coluna={coluna(4)}>
                <Comparacao
                  diferenca={diferencaParaMedia(
                    parcela.valorCentavos,
                    referencias.mediaPagaCentavos,
                  )}
                />
              </Celula>
            </LinhaDaTabela>
          ))}
        </Tabela>
      )}

      {parcelas.length > 0 && (
        <p className="text-caption text-stone">
          Verde: até 10% acima da média paga · âmbar: até 35% · vermelho: acima disso.
        </p>
      )}
    </div>
  );
}

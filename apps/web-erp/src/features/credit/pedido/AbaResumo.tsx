import type { PedidoDeVenda } from '@synapse/types';
import { CalendarClock, UserPen } from 'lucide-react';
import {
  formatarDataHora,
  formatarDocumento,
  formatarMoeda,
  prazoDoPedido,
  ROTULO_DA_ORIGEM,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_TIPO,
} from '../analise';
import { Bloco, Campo, Grade } from './Bloco';
import { descricaoDoParcelamento, semCobranca, vencimentosDoPedido } from './parcelas';

const BOTAO_SUAVE =
  'bg-surface-soft text-button-sm text-ink inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 transition hover:bg-[#ececee]';

/** Primeira aba: quem comprou, o que foi combinado e como vai pagar. O prazo e
 *  clicavel — abre o calendario das parcelas. */
export function AbaResumo({
  pedido,
  aoVerParcelas,
  aoAbrirCadastro,
}: {
  readonly pedido: PedidoDeVenda;
  readonly aoVerParcelas: () => void;
  readonly aoAbrirCadastro: () => void;
}) {
  const dias = vencimentosDoPedido(pedido);
  const cobrado = !semCobranca(pedido);

  return (
    <div className="grid gap-4">
      <Bloco
        titulo="Cliente"
        acao={
          <button type="button" onClick={aoAbrirCadastro} className={BOTAO_SUAVE}>
            <UserPen size={14} aria-hidden="true" /> Cadastro do cliente
          </button>
        }
      >
        <p className="font-display text-heading-sm text-ink">{pedido.clienteNome}</p>
        <p className="text-body-sm text-mute mt-1 tabular-nums">
          {formatarDocumento(pedido.clienteDocumento) || 'Sem CPF/CNPJ informado'}
          {pedido.clienteCidade && ` · ${pedido.clienteCidade}`}
          {pedido.clienteBairro && ` · ${pedido.clienteBairro}`}
        </p>
      </Bloco>

      <Bloco titulo="Pagamento">
        <Grade>
          <Campo rotulo="Forma de pagamento">{pedido.formaDePagamento}</Campo>
          <Campo rotulo="Parcelamento">
            {cobrado ? (
              <button
                type="button"
                onClick={aoVerParcelas}
                title="Ver em que dia cai cada parcela e quanto vale"
                className="text-ink decoration-hairline-strong/30 hover:decoration-ink inline-flex items-center gap-1.5 underline decoration-2 underline-offset-4 transition"
              >
                <CalendarClock size={15} aria-hidden="true" />
                {descricaoDoParcelamento(dias)}
              </button>
            ) : (
              'Sem cobrança'
            )}
          </Campo>
          <Campo rotulo="Parcelas">{cobrado ? `${dias.length}x` : '—'}</Campo>
          <Campo rotulo="Prazo médio">{prazoDoPedido(pedido)}</Campo>
          <Campo rotulo="Desconto">{formatarMoeda(pedido.descontoCentavos)}</Campo>
          <Campo rotulo="Valor total">
            <span className="text-heading-sm">{formatarMoeda(pedido.totalCentavos)}</span>
          </Campo>
        </Grade>
      </Bloco>

      <Bloco titulo="Pedido">
        <Grade>
          <Campo rotulo="Número">{pedido.numero}</Campo>
          <Campo rotulo="Tipo">{ROTULO_DO_TIPO[pedido.tipo]}</Campo>
          <Campo rotulo="Situação">{ROTULO_DA_SITUACAO[pedido.situacao]}</Campo>
          <Campo rotulo="Representante">{pedido.vendedorNome}</Campo>
          <Campo rotulo="Origem">{ROTULO_DA_ORIGEM[pedido.origem]}</Campo>
          <Campo rotulo="Enviado em">{formatarDataHora(pedido.enviadoEm)}</Campo>
        </Grade>
      </Bloco>
    </div>
  );
}

import type {
  AvaliacaoDoPedido,
  CarteiraDoCliente,
  ClienteDaAnalise,
  PedidoDeVenda,
} from '@synapse/types';
import { descricaoDoParcelamento, vencimentosDoPedido } from '@synapse/validation';
import { UserRound } from 'lucide-react';
import { formatarDocumento, prazoDoPedido, ROTULO_DA_ORIGEM } from '../analise';
import { SimulacaoDeParcelas } from '../parcelas/SimulacaoDeParcelas';
import { ROTULO_DA_NATUREZA } from '../rotulos';
import { lancadoPor } from '../documentos/autoria';
import { BOTAO_CLARO, Dado, Dados, Secao } from '../ui/Superficies';
import { ItensDoPedido } from './ItensDoPedido';

function ClienteEVendedor({
  pedido,
  cliente,
  aoAbrirCadastro,
}: {
  readonly pedido: PedidoDeVenda;
  readonly cliente: ClienteDaAnalise;
  readonly aoAbrirCadastro: () => void;
}) {
  const autor = lancadoPor(pedido);
  const local = [pedido.clienteCidade ?? cliente.cidade, pedido.clienteBairro ?? cliente.bairro]
    .filter(Boolean)
    .join(' · ');
  return (
    <Secao
      titulo="Cliente e vendedor"
      acao={
        <button type="button" onClick={aoAbrirCadastro} className={BOTAO_CLARO}>
          <UserRound size={14} aria-hidden="true" /> Cadastro
        </button>
      }
    >
      <Dados colunas={3}>
        <Dado rotulo="Nome / razão social" largo>
          {cliente.nome || pedido.clienteNome}
        </Dado>
        <Dado rotulo="Código do cliente" vazio="Sem código no cadastro">
          {cliente.codigo}
        </Dado>
        <Dado rotulo="CNPJ / CPF" vazio="Sem documento">
          {formatarDocumento(pedido.clienteDocumento ?? cliente.documento)}
        </Dado>
        <Dado rotulo="Cidade · bairro">{local}</Dado>
        <Dado rotulo="Representante comercial">{pedido.vendedorNome}</Dado>
        <Dado rotulo="Código do representante" vazio="Não cadastrado" />
        <Dado rotulo="Lançado por (usuário/caixa)" vazio="Não registrado">
          {autor?.nome}
        </Dado>
        <Dado rotulo="Origem">{ROTULO_DA_ORIGEM[pedido.origem]}</Dado>
      </Dados>
    </Secao>
  );
}

function Condicao({
  pedido,
  avaliacao,
  carteira,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | null;
  readonly carteira: CarteiraDoCliente | null;
}) {
  const dias = vencimentosDoPedido(pedido);
  const semCobranca = avaliacao?.exposicao.natureza === 'SEM_COBRANCA';
  return (
    <Secao titulo="Condição de pagamento">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <div>
          <p className="text-caption text-stone">Condição escolhida</p>
          <p className="font-display text-heading-sm text-ink flex items-center gap-1 tabular-nums">
            {semCobranca
              ? 'Sem cobrança'
              : `${descricaoDoParcelamento(dias)}${dias.some((d) => d > 0) ? ' dias' : ''}`}
            {!semCobranca && <SimulacaoDeParcelas pedido={pedido} carteira={carteira} />}
          </p>
        </div>
        <div>
          <p className="text-caption text-stone">Prazo médio</p>
          <p className="font-display text-heading-sm text-ink tabular-nums">
            {prazoDoPedido(pedido)}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Dados colunas={4}>
          <Dado rotulo="Forma de pagamento">{pedido.formaDePagamento}</Dado>
          <Dado rotulo="Parcelas">{semCobranca ? '—' : `${dias.length}x`}</Dado>
          <Dado rotulo="Natureza">
            {avaliacao ? ROTULO_DA_NATUREZA[avaliacao.exposicao.natureza] : null}
          </Dado>
          <Dado rotulo="Texto da condição">{pedido.condicaoDePagamento}</Dado>
        </Dados>
      </div>
    </Secao>
  );
}

/** Primeira aba: quem compra, quem vendeu, o que foi combinado e o que vai na
 *  carga — os itens ficam aqui mesmo, sem aba separada. */
export function AbaResumo({
  pedido,
  avaliacao,
  cliente,
  carteira,
  aoAbrirCadastro,
}: {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido | null;
  readonly cliente: ClienteDaAnalise;
  readonly carteira: CarteiraDoCliente | null;
  readonly aoAbrirCadastro: () => void;
}) {
  return (
    <div className="grid gap-3">
      <ClienteEVendedor pedido={pedido} cliente={cliente} aoAbrirCadastro={aoAbrirCadastro} />
      <Condicao pedido={pedido} avaliacao={avaliacao} carteira={carteira} />
      <Secao titulo={`Itens (${pedido.itens.length})`}>
        <ItensDoPedido pedido={pedido} />
      </Secao>
    </div>
  );
}

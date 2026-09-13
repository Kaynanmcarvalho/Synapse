import type { DetalheDoPedido as Detalhe } from '@synapse/types';
import { descricaoDoParcelamento, vencimentosDoPedido } from '@synapse/validation';
import {
  formatarData,
  formatarDataHora,
  formatarDocumento,
  formatarMoeda,
  prazoDoPedido,
  ROTULO_DA_ORIGEM,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_TIPO,
} from '../analise';
import { ItensDoPedido } from '../analise/ItensDoPedido';
import { SimulacaoDeParcelas } from '../parcelas/SimulacaoDeParcelas';
import { Dado, Dados, Secao } from '../ui/Superficies';
import { linhaDoPedido } from './linha-do-pedido';
import { documentoDaNota, type Documento } from './navegacao';
import { LinhaDoTempo, TitulosDoDocumento, Vinculo } from './partes';

const titulosGravados = (detalhe: Detalhe) =>
  detalhe.titulos.map((titulo) => {
    const [numero, total] = titulo.parcela.split('/').map(Number);
    return {
      id: titulo.id,
      numeroParcela: numero || 1,
      totalDeParcelas: total || 1,
      vencimento: titulo.vencimento,
      valorOriginalCentavos: titulo.valorOriginalCentavos,
      status: titulo.situacao,
    };
  });

function Cabecalho({ detalhe, aoSeguir }: { detalhe: Detalhe; aoSeguir: (d: Documento) => void }) {
  const { pedido, lancadoPor } = detalhe;
  const dias = vencimentosDoPedido(pedido);
  return (
    <Secao titulo={`Pedido ${pedido.numero}`}>
      <Dados colunas={4}>
        <Dado rotulo="Cliente" largo>
          {pedido.clienteNome} · {formatarDocumento(pedido.clienteDocumento) || 'sem documento'}
        </Dado>
        <Dado rotulo="Representante">{pedido.vendedorNome}</Dado>
        <Dado rotulo="Código do representante" vazio="Não cadastrado" />
        <Dado rotulo="Lançado por" vazio="Não registrado">
          {lancadoPor?.nome}
        </Dado>
        <Dado rotulo="Data e hora">{formatarDataHora(pedido.enviadoEm)}</Dado>
        <Dado rotulo="Origem">{ROTULO_DA_ORIGEM[pedido.origem]}</Dado>
        <Dado rotulo="Tipo">{ROTULO_DO_TIPO[pedido.tipo]}</Dado>
        <Dado rotulo="Situação">{ROTULO_DA_SITUACAO[pedido.situacao]}</Dado>
        <Dado rotulo="Condição">
          <span className="inline-flex items-center gap-1">
            {descricaoDoParcelamento(dias)}
            <SimulacaoDeParcelas pedido={pedido} titulos={titulosGravados(detalhe)} />
          </span>
        </Dado>
        <Dado rotulo="Prazo médio">{prazoDoPedido(pedido)}</Dado>
        <Dado rotulo="Valor">{formatarMoeda(pedido.totalCentavos)}</Dado>
        <Dado rotulo="Nota fiscal" vazio="Ainda não faturado">
          {pedido.nota ? (
            <Vinculo
              documento={documentoDaNota({ pedidoId: pedido.id, numero: pedido.nota.numero })}
              aoSeguir={aoSeguir}
            >
              NF {pedido.nota.numero} · {formatarData(pedido.nota.emitidaEm)}
            </Vinculo>
          ) : null}
        </Dado>
      </Dados>
    </Secao>
  );
}

/** Detalhe de um pedido historico — nao e a analise de credito. Mostra o que
 *  foi vendido, o caminho do pedido e os documentos que ele gerou. */
export function DetalheDoPedido({
  detalhe,
  aoSeguir,
}: {
  readonly detalhe: Detalhe;
  readonly aoSeguir: (documento: Documento) => void;
}) {
  const { pedido } = detalhe;
  const observacoes = [...(pedido.observacoes ?? [])].sort((a, b) => b.em.localeCompare(a.em));
  return (
    <div className="grid gap-3">
      <Cabecalho detalhe={detalhe} aoSeguir={aoSeguir} />
      <Secao titulo="Caminho do pedido">
        <LinhaDoTempo
          formatar={formatarDataHora}
          itens={linhaDoPedido(detalhe).map((passo) => ({
            chave: passo.id,
            em: passo.em,
            titulo: passo.rotulo,
            detalhe: passo.detalhe,
            autor: passo.autor,
            feito: passo.feito,
          }))}
        />
      </Secao>
      <Secao titulo={`Itens (${pedido.itens.length})`}>
        <ItensDoPedido pedido={pedido} />
      </Secao>
      <Secao titulo="Títulos gerados">
        <TitulosDoDocumento
          titulos={detalhe.titulos}
          aoSeguir={aoSeguir}
          vazio="Este pedido não gerou títulos a receber."
        />
      </Secao>
      <Secao titulo="Observações">
        {observacoes.length === 0 ? (
          <p className="text-body-sm text-stone">Nenhuma observação.</p>
        ) : (
          <ul className="grid gap-2">
            {observacoes.map((observacao) => (
              <li key={observacao.id} className="text-body-sm text-charcoal">
                <strong className="text-ink">{observacao.porNome}</strong>
                <span className="text-caption text-stone">
                  {' '}
                  · {formatarDataHora(observacao.em)}
                </span>
                <p className="whitespace-pre-line">{observacao.texto}</p>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}

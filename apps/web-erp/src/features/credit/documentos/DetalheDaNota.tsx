import type { DetalheDaNota as Detalhe } from '@synapse/types';
import { formatarDataHora, formatarDocumento, formatarMoeda, ROTULO_DA_SITUACAO } from '../analise';
import { ROTULO_DO_EVENTO } from '../pedido/rotulos';
import { Situacao } from '../ui/Etiquetas';
import { Ausente, Dado, Dados, Secao } from '../ui/Superficies';
import { documentoDoPedido, type Documento } from './navegacao';
import { Copiar, LinhaDoTempo, TitulosDoDocumento, Vinculo } from './partes';

function Cabecalho({
  detalhe,
  aoSeguir,
}: {
  readonly detalhe: Detalhe;
  readonly aoSeguir: (documento: Documento) => void;
}) {
  const cancelado = detalhe.pedidoSituacao === 'CANCELADO';
  return (
    <Secao
      titulo={`NF ${detalhe.numero} · série ${detalhe.serie}`}
      acao={cancelado ? <Situacao tom="critico" texto="Pedido de origem cancelado" /> : undefined}
    >
      <Dados colunas={4}>
        <Dado rotulo="Emissão">{formatarDataHora(detalhe.emitidaEm)}</Dado>
        <Dado rotulo="Status fiscal" vazio="Não registrado no Synapse">
          {detalhe.situacaoFiscal}
        </Dado>
        <Dado rotulo="Pedido de origem">
          <Vinculo
            documento={documentoDoPedido({ id: detalhe.pedidoId, numero: detalhe.pedidoNumero })}
            aoSeguir={aoSeguir}
          />
        </Dado>
        <Dado rotulo="Situação do pedido">{ROTULO_DA_SITUACAO[detalhe.pedidoSituacao]}</Dado>
        <Dado rotulo="Cliente" largo>
          {detalhe.cliente.nome} · {formatarDocumento(detalhe.cliente.documento) || 'sem documento'}
        </Dado>
        <Dado rotulo="Vendedor">{detalhe.vendedorNome}</Dado>
        <Dado rotulo="Chave de acesso" largo vazio="Chave não informada pelo faturamento">
          {detalhe.chaveDeAcesso ? (
            <span className="inline-flex flex-wrap items-center gap-2 break-all">
              {detalhe.chaveDeAcesso}
              <Copiar valor={detalhe.chaveDeAcesso} rotulo="Copiar a chave de acesso" />
            </span>
          ) : null}
        </Dado>
      </Dados>
    </Secao>
  );
}

/** Detalhe da nota fiscal: numero, chave, valores e os titulos que ela gerou.
 *  O Synapse ainda nao guarda o XML nem o status da SEFAZ ligado ao pedido —
 *  a tela diz isso, em vez de oferecer botoes que nao funcionam. */
export function DetalheDaNota({
  detalhe,
  aoSeguir,
}: {
  readonly detalhe: Detalhe;
  readonly aoSeguir: (documento: Documento) => void;
}) {
  return (
    <div className="grid gap-3">
      <Cabecalho detalhe={detalhe} aoSeguir={aoSeguir} />
      <Secao titulo="Valores">
        <Dados colunas={4}>
          <Dado rotulo="Produtos">{formatarMoeda(detalhe.produtosCentavos)}</Dado>
          <Dado rotulo="Descontos">{formatarMoeda(detalhe.descontoCentavos)}</Dado>
          <Dado rotulo="Frete" vazio="Sem frete">
            {detalhe.freteCentavos ? formatarMoeda(detalhe.freteCentavos) : null}
          </Dado>
          <Dado rotulo="Total">{formatarMoeda(detalhe.totalCentavos)}</Dado>
        </Dados>
      </Secao>
      <Secao titulo="Títulos originados">
        <TitulosDoDocumento
          titulos={detalhe.titulos}
          aoSeguir={aoSeguir}
          vazio="Nenhum título ligado a esta nota."
        />
      </Secao>
      <Secao titulo="Eventos do faturamento">
        {detalhe.eventos.length === 0 ? (
          <Ausente texto="Nenhum evento do faturamento registrado para esta nota." />
        ) : (
          <LinhaDoTempo
            formatar={formatarDataHora}
            itens={detalhe.eventos.map((evento, indice) => ({
              chave: `${evento.tipo}-${indice}`,
              em: evento.em,
              titulo: ROTULO_DO_EVENTO[evento.tipo],
              detalhe: evento.detalhe,
              autor: evento.porNome,
            }))}
          />
        )}
      </Secao>
      <Secao titulo="Documentos fiscais">
        <Ausente
          texto={
            detalhe.xmlDisponivel || detalhe.danfeDisponivel
              ? 'Documentos disponíveis.'
              : 'XML e DANFE ainda não são guardados junto do pedido no Synapse.'
          }
        />
      </Secao>
    </div>
  );
}

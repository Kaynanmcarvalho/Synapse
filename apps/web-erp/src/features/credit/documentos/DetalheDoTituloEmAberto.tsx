import type { DetalheDoTitulo } from '@synapse/types';
import { formatarData, formatarMoeda } from '../analise';
import { ROTULO_DA_SITUACAO_DO_TITULO } from '../rotulos';
import { Situacao } from '../ui/Etiquetas';
import { Dado, Dados, Secao } from '../ui/Superficies';
import { AreaDoBoleto } from './AreaDoBoleto';
import type { Documento } from './navegacao';
import { EventosDoTitulo, Liquidacoes, VinculosDoTitulo } from './partesDoTitulo';
import { prazoDoTitulo } from './titulo';

const tom = (titulo: DetalheDoTitulo) => {
  if (titulo.situacao === 'VENCIDO') return 'critico' as const;
  if (titulo.situacao === 'CANCELADO' || titulo.situacao === 'RENEGOCIADO')
    return 'atencao' as const;
  return 'neutro' as const;
};

/** Titulo a receber: quanto falta, quando vence e como esta sendo cobrado.
 *  Pagamento parcial aparece como original, recebido e saldo. */
export function DetalheDoTituloEmAberto({
  titulo,
  aoSeguir,
}: {
  readonly titulo: DetalheDoTitulo;
  readonly aoSeguir: (documento: Documento) => void;
}) {
  return (
    <div className="grid gap-3">
      <Secao
        titulo={`Título ${titulo.numero} · parcela ${titulo.parcela}`}
        acao={<Situacao tom={tom(titulo)} texto={ROTULO_DA_SITUACAO_DO_TITULO[titulo.situacao]} />}
      >
        <Dados colunas={4}>
          <Dado rotulo="Título">{titulo.numero}</Dado>
          <Dado rotulo="Série">{titulo.serie}</Dado>
          <Dado rotulo="Parcela">{titulo.parcela}</Dado>
          <Dado rotulo="Emissão">{formatarData(titulo.emitidoEm)}</Dado>
          <Dado rotulo="Pedido e NF" largo>
            <VinculosDoTitulo titulo={titulo} aoSeguir={aoSeguir} />
          </Dado>
          <Dado rotulo="Vencimento">{formatarData(titulo.vencimento)}</Dado>
          <Dado rotulo="Prazo">{prazoDoTitulo(titulo)}</Dado>
          <Dado rotulo="Forma de cobrança" vazio="Não informada no título">
            {titulo.formaDeCobranca === 'BOLETO' ? 'Boleto' : null}
          </Dado>
          <Dado rotulo="Descrição">{titulo.descricao}</Dado>
        </Dados>
      </Secao>
      <Secao titulo="Valores">
        <Dados colunas={3}>
          <Dado rotulo="Valor original">{formatarMoeda(titulo.valorOriginalCentavos)}</Dado>
          <Dado rotulo="Recebido">{formatarMoeda(titulo.recebidoCentavos)}</Dado>
          <Dado rotulo="Saldo">{formatarMoeda(titulo.saldoCentavos)}</Dado>
        </Dados>
        {titulo.renegociadoPara.length > 0 && (
          <p className="text-caption mt-3 text-[#8a4b00]">
            Renegociado: substituído por {titulo.renegociadoPara.length} título(s). O saldo passou a
            ser cobrado neles.
          </p>
        )}
      </Secao>
      <Secao titulo="Recebimentos">
        <Liquidacoes titulo={titulo} />
      </Secao>
      {titulo.boleto ? (
        <AreaDoBoleto boleto={titulo.boleto} />
      ) : (
        <Secao titulo="Cobrança bancária">
          <p className="text-body-sm text-stone">
            Nenhum boleto foi emitido para este título no Synapse.
          </p>
        </Secao>
      )}
      <Secao titulo="Histórico do título">
        <EventosDoTitulo titulo={titulo} />
      </Secao>
    </div>
  );
}

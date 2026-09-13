import type { DetalheDoTitulo } from '@synapse/types';
import { diasEntreDatas } from '@synapse/validation';
import { formatarData, formatarMoeda, pagamentoPorExtenso } from '../analise';
import { ROTULO_DA_FORMA, ROTULO_DO_BANCO } from '../rotulos';
import { Situacao } from '../ui/Etiquetas';
import { Dado, Dados, Secao } from '../ui/Superficies';
import type { Documento } from './navegacao';
import { EventosDoTitulo, Liquidacoes, VinculosDoTitulo } from './partesDoTitulo';

/** Juros, multa e desconto: o Synapse registra a liquidacao pelo valor e nao
 *  aceita receber acima do saldo — entao nao ha como ter cobrado encargo. */
const ENCARGO_NAO_REGISTRADO = 'Não registrado na liquidação';

function Comportamento({ titulo }: { readonly titulo: DetalheDoTitulo }) {
  if (!titulo.quitadoEm)
    return (
      <Situacao
        tom="atencao"
        texto={
          titulo.recebidoCentavos > 0
            ? 'Pago parcialmente — ainda com saldo'
            : 'Ainda não liquidado'
        }
      />
    );
  const dias = diasEntreDatas(titulo.vencimento, titulo.quitadoEm);
  return <Situacao tom={dias > 0 ? 'atencao' : 'positivo'} texto={pagamentoPorExtenso(dias)} />;
}

/** Titulo pago: o foco e como a liquidacao aconteceu — quando, quanto, por qual
 *  meio e em relacao ao vencimento. O numero cru de dias vira frase. */
export function DetalheDoTituloPago({
  titulo,
  aoSeguir,
}: {
  readonly titulo: DetalheDoTitulo;
  readonly aoSeguir: (documento: Documento) => void;
}) {
  const formas = [
    ...new Set(titulo.liquidacoes.map((liquidacao) => ROTULO_DA_FORMA[liquidacao.forma])),
  ];
  const conta = titulo.boleto?.bancoId
    ? `${ROTULO_DO_BANCO[titulo.boleto.bancoId]}${titulo.boleto.contaApelido ? ` · ${titulo.boleto.contaApelido}` : ''}`
    : null;
  return (
    <div className="grid gap-3">
      <Secao
        titulo={`Liquidação · título ${titulo.numero} · parcela ${titulo.parcela}`}
        acao={<Comportamento titulo={titulo} />}
      >
        <Dados colunas={4}>
          <Dado rotulo="Pedido e NF" largo>
            <VinculosDoTitulo titulo={titulo} aoSeguir={aoSeguir} />
          </Dado>
          <Dado rotulo="Vencimento">{formatarData(titulo.vencimento)}</Dado>
          <Dado rotulo="Data da liquidação" vazio="Ainda com saldo">
            {titulo.quitadoEm ? formatarData(titulo.quitadoEm) : null}
          </Dado>
          <Dado rotulo="Forma de recebimento" vazio="Sem recebimento">
            {formas.join(', ')}
          </Dado>
          <Dado rotulo="Conta / banco" vazio="Não informado na liquidação">
            {conta}
          </Dado>
        </Dados>
      </Secao>
      <Secao titulo="Valores da liquidação">
        <Dados colunas={3}>
          <Dado rotulo="Valor original">{formatarMoeda(titulo.valorOriginalCentavos)}</Dado>
          <Dado rotulo="Juros" vazio={ENCARGO_NAO_REGISTRADO} />
          <Dado rotulo="Multa" vazio={ENCARGO_NAO_REGISTRADO} />
          <Dado rotulo="Desconto" vazio={ENCARGO_NAO_REGISTRADO} />
          <Dado rotulo="Valor efetivamente recebido">{formatarMoeda(titulo.recebidoCentavos)}</Dado>
          <Dado rotulo="Saldo">{formatarMoeda(titulo.saldoCentavos)}</Dado>
        </Dados>
      </Secao>
      <Secao titulo="Recebimentos">
        <Liquidacoes titulo={titulo} />
      </Secao>
      <Secao titulo="Histórico">
        <EventosDoTitulo titulo={titulo} />
      </Secao>
    </div>
  );
}

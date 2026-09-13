import type { CarteiraDoCliente } from '@synapse/types';
import { Cartao, Total, Vazio } from './Cartao';
import { descricaoDoAtraso, formatarData, formatarMoeda } from './analise';

/** Canto inferior esquerdo: o que o cliente ainda deve. O que venceu aparece
 *  com o tamanho do atraso, porque e isso que trava ou libera o pedido. */
export function TitulosEmAberto({ carteira }: { readonly carteira: CarteiraDoCliente }) {
  const { titulosEmAberto, totalVencidoCentavos, totalAVencerCentavos } = carteira;

  return (
    <Cartao
      titulo="Títulos em aberto"
      acao={<span className="text-body-sm text-stone">{titulosEmAberto.length} título(s)</span>}
      rodape={
        <>
          <Total
            rotulo="Vencido"
            valor={formatarMoeda(totalVencidoCentavos)}
            tom={totalVencidoCentavos > 0 ? 'alerta' : 'neutro'}
          />
          <Total rotulo="A vencer" valor={formatarMoeda(totalAVencerCentavos)} />
          <Total
            rotulo="Total em aberto"
            valor={formatarMoeda(totalVencidoCentavos + totalAVencerCentavos)}
          />
        </>
      }
    >
      {titulosEmAberto.length === 0 ? (
        <Vazio texto="Nenhum título em aberto." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="text-caption text-stone">
                <th className="py-2 font-medium">Título</th>
                <th className="py-2 font-medium">Série</th>
                <th className="py-2 font-medium">Parcela</th>
                <th className="py-2 font-medium">Vencimento</th>
                <th className="py-2 text-right font-medium">Saldo</th>
                <th className="py-2 text-right font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-hairline-light text-body-sm divide-y">
              {titulosEmAberto.map((titulo) => (
                <tr key={titulo.id}>
                  <td className="text-ink py-2.5 pr-3 font-semibold">{titulo.numero}</td>
                  <td className="text-charcoal py-2.5 pr-3">{titulo.serie}</td>
                  <td className="text-charcoal py-2.5 pr-3">{titulo.parcela}</td>
                  <td className="text-charcoal py-2.5 pr-3">{formatarData(titulo.vencimento)}</td>
                  <td className="text-ink py-2.5 text-right font-semibold">
                    {formatarMoeda(titulo.saldoCentavos)}
                  </td>
                  <td
                    className={`py-2.5 text-right ${titulo.diasDeAtraso > 0 ? 'text-accent-danger font-semibold' : 'text-stone'}`}
                  >
                    {descricaoDoAtraso(titulo.diasDeAtraso)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  );
}

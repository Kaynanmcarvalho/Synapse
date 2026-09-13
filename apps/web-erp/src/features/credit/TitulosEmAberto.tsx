import type { CarteiraDoCliente } from '@synapse/types';
import { Cartao, Total, Vazio } from './Cartao';
import { BotaoLupa, Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from './Tabela';
import { descricaoDoAtraso, formatarData, formatarMoeda } from './analise';
import { documentoDoTitulo, type Documento } from './documentos/navegacao';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Título' },
  { rotulo: 'Série', alinhamento: 'centro', largura: '64px' },
  { rotulo: 'Parcela', alinhamento: 'centro', largura: '76px' },
  { rotulo: 'Vencimento', alinhamento: 'centro' },
  { rotulo: 'Saldo', alinhamento: 'direita' },
  { rotulo: 'Situação', alinhamento: 'direita' },
  { rotulo: '', alinhamento: 'centro', largura: '48px' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

/** Canto inferior esquerdo: o que o cliente ainda deve. A lupa abre o titulo a
 *  receber — saldo, cobranca e boleto —, e nao o pedido. */
export function TitulosEmAberto({
  carteira,
  aoAbrirDocumento,
}: {
  readonly carteira: CarteiraDoCliente;
  readonly aoAbrirDocumento: (documento: Documento) => void;
}) {
  const { titulosEmAberto, totalVencidoCentavos, totalAVencerCentavos } = carteira;

  return (
    <Cartao
      titulo="Títulos a receber"
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
        <Tabela colunas={COLUNAS} larguraMinima={560}>
          {titulosEmAberto.map((titulo) => {
            const vencido = titulo.diasDeAtraso > 0;
            const parcial = titulo.saldoCentavos < titulo.valorCentavos;
            return (
              <LinhaDaTabela key={titulo.id} destaque={vencido}>
                <Celula coluna={coluna(0)} forte>
                  {titulo.numero}
                </Celula>
                <Celula coluna={coluna(1)}>{titulo.serie}</Celula>
                <Celula coluna={coluna(2)}>{titulo.parcela}</Celula>
                <Celula coluna={coluna(3)}>{formatarData(titulo.vencimento)}</Celula>
                <Celula coluna={coluna(4)} forte>
                  {formatarMoeda(titulo.saldoCentavos)}
                  {parcial && (
                    <span className="text-caption text-stone block font-normal">
                      de {formatarMoeda(titulo.valorCentavos)}
                    </span>
                  )}
                </Celula>
                <Celula coluna={coluna(5)}>
                  <span className={vencido ? 'font-semibold text-[#b3242f]' : 'text-stone'}>
                    {descricaoDoAtraso(titulo.diasDeAtraso)}
                  </span>
                </Celula>
                <Celula coluna={coluna(6)}>
                  <BotaoLupa
                    rotulo={`Abrir o título ${titulo.numero} parcela ${titulo.parcela}`}
                    aoAbrir={() => aoAbrirDocumento(documentoDoTitulo(titulo, 'aberto'))}
                  />
                </Celula>
              </LinhaDaTabela>
            );
          })}
        </Tabela>
      )}
    </Cartao>
  );
}

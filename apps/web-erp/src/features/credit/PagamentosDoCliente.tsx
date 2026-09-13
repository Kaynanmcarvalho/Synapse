import type { CarteiraDoCliente } from '@synapse/types';
import { Cartao, Total, Vazio } from './Cartao';
import { BotaoLupa, Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from './Tabela';
import { formatarData, formatarMoeda, pagamentoRelativo } from './analise';
import { documentoDoTitulo, type Documento } from './documentos/navegacao';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Título' },
  { rotulo: 'Parcela', alinhamento: 'centro', largura: '72px' },
  { rotulo: 'Vencimento', alinhamento: 'centro' },
  { rotulo: 'Pago em', alinhamento: 'centro' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: 'Pagamento' },
  { rotulo: '', alinhamento: 'centro', largura: '48px' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

/** Pagamento em palavras e com um marcador de forma — cor nunca sozinha. */
function Pagamento({ dias }: { readonly dias: number }) {
  const atraso = dias > 0;
  const marcador = dias < 0 ? '▲' : dias === 0 ? '●' : '▼';
  return (
    <span
      className={`whitespace-nowrap ${atraso ? 'font-semibold text-[#b3242f]' : 'text-accent-green-text'}`}
    >
      <span aria-hidden="true" className="mr-1 text-[10px]">
        {marcador}
      </span>
      {pagamentoRelativo(dias)}
    </span>
  );
}

/** Canto inferior direito: como o cliente paga. A coluna "Pagamento" diz "6
 *  dias antes", "No vencimento" ou "4 dias após" — o numero cru fica nos
 *  calculos de pontualidade. A lupa abre o titulo pago, com a liquidacao. */
export function PagamentosDoCliente({
  carteira,
  pagoEm12Meses,
  aoAbrirDocumento,
}: {
  readonly carteira: CarteiraDoCliente;
  readonly pagoEm12Meses: number;
  readonly aoAbrirDocumento: (documento: Documento) => void;
}) {
  const { pagamentos } = carteira;

  return (
    <Cartao
      titulo="Títulos pagos"
      acao={<span className="text-body-sm text-stone">{pagamentos.length} pagamento(s)</span>}
      rodape={
        <Total
          rotulo="Pago em 12 meses"
          valor={formatarMoeda(pagoEm12Meses)}
          tom={pagoEm12Meses > 0 ? 'positivo' : 'neutro'}
        />
      }
    >
      {pagamentos.length === 0 ? (
        <Vazio texto="Nenhum pagamento registrado." />
      ) : (
        <Tabela colunas={COLUNAS} larguraMinima={560}>
          {pagamentos.map((pagamento, indice) => (
            <LinhaDaTabela key={`${pagamento.tituloId}-${pagamento.pagoEm}-${indice}`}>
              <Celula coluna={coluna(0)} forte>
                {pagamento.numero}
              </Celula>
              <Celula coluna={coluna(1)}>{pagamento.parcela}</Celula>
              <Celula coluna={coluna(2)}>{formatarData(pagamento.vencimento)}</Celula>
              <Celula coluna={coluna(3)}>{formatarData(pagamento.pagoEm)}</Celula>
              <Celula coluna={coluna(4)} forte>
                {formatarMoeda(pagamento.valorCentavos)}
              </Celula>
              <Celula coluna={coluna(5)}>
                <Pagamento dias={pagamento.diasDoPagamento} />
              </Celula>
              <Celula coluna={coluna(6)}>
                <BotaoLupa
                  rotulo={`Abrir a liquidação do título ${pagamento.numero} parcela ${pagamento.parcela}`}
                  aoAbrir={() =>
                    aoAbrirDocumento(
                      documentoDoTitulo(
                        {
                          id: pagamento.tituloId,
                          numero: pagamento.numero,
                          parcela: pagamento.parcela,
                        },
                        'pago',
                      ),
                    )
                  }
                />
              </Celula>
            </LinhaDaTabela>
          ))}
        </Tabela>
      )}
    </Cartao>
  );
}

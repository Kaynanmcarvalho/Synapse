import type { PainelDeAnaliseDeCredito } from '@synapse/types';
import { Bloco } from '../campos';
import { formatarData, formatarMoeda } from '../formato';
import type { PropsDaAba } from './aba';
import type { VisaoDeCredito } from '../useVisaoDeCredito';

/** Aba Documentos: o que existe em nome deste cliente — notas fiscais emitidas
 *  e títulos a receber. Vem do próprio sistema; nada é digitado aqui.
 *
 *  Anexar arquivo (contrato, ficha assinada, procuração) ainda não existe no
 *  Synapse, e a aba diz isso em vez de oferecer um botão que não grava. */

function Tabela({
  colunas,
  linhas,
  vazio,
}: {
  readonly colunas: readonly string[];
  readonly linhas: readonly (readonly string[])[];
  readonly vazio: string;
}) {
  if (linhas.length === 0) return <p className="text-body-sm text-stone">{vazio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse">
        <thead>
          <tr className="border-hairline-light border-b">
            {colunas.map((coluna) => (
              <th
                key={coluna}
                className="text-caption text-stone px-2 py-1.5 text-left font-semibold uppercase tracking-[0.06em]"
              >
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr key={indice} className="border-hairline-light border-b last:border-0">
              {linha.map((celula, coluna) => (
                <td
                  key={coluna}
                  className={`text-body-sm text-ink px-2 py-1.5 ${coluna > 0 ? 'tabular-nums' : ''}`}
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const notas = (painel: PainelDeAnaliseDeCredito) =>
  painel.ultimasNotas.map((nota) => [
    `NF ${nota.numero}`,
    formatarData(nota.emitidaEm),
    nota.pedidoNumero ? `Pedido ${nota.pedidoNumero}` : '—',
    formatarMoeda(nota.totalCentavos ?? 0),
  ]);

const titulos = (painel: PainelDeAnaliseDeCredito) =>
  painel.carteira.titulosEmAberto.map((titulo) => [
    `${titulo.numero} · ${titulo.parcela}`,
    formatarData(titulo.vencimento),
    formatarMoeda(titulo.saldoCentavos),
    titulo.diasDeAtraso > 0 ? `Vencido há ${titulo.diasDeAtraso} dia(s)` : 'A vencer',
  ]);

const pagamentos = (painel: PainelDeAnaliseDeCredito) =>
  painel.carteira.pagamentos.map((pagamento) => [
    `${pagamento.numero} · ${pagamento.parcela}`,
    formatarData(pagamento.pagoEm),
    formatarMoeda(pagamento.valorCentavos),
    pagamento.diasDoPagamento > 0
      ? `${pagamento.diasDoPagamento} dia(s) após o vencimento`
      : pagamento.diasDoPagamento < 0
        ? `${Math.abs(pagamento.diasDoPagamento)} dia(s) antes`
        : 'No vencimento',
  ]);

export function AbaDocumentos({ cliente, visao }: PropsDaAba & { readonly visao: VisaoDeCredito }) {
  if (!cliente) {
    return (
      <Bloco titulo="Documentos">
        <p className="text-body-sm text-stone">
          Os documentos aparecem depois de salvar o cadastro: nota fiscal emitida e título a receber
          nascem dos pedidos deste cliente.
        </p>
      </Bloco>
    );
  }
  if (visao.status === 'sem-permissao') {
    return (
      <Bloco titulo="Documentos">
        <p className="text-body-sm text-stone">
          Notas fiscais e títulos deste cliente exigem permissão do financeiro
          (financeiro.visualizar). Seu usuário edita o cadastro, mas não vê o financeiro.
        </p>
      </Bloco>
    );
  }
  if (visao.status !== 'pronto') {
    return (
      <Bloco titulo="Documentos">
        <p className="text-body-sm text-stone">
          {visao.status === 'erro' ? visao.mensagem : 'Carregando documentos…'}
        </p>
      </Bloco>
    );
  }

  return (
    <div className="grid gap-3">
      <Bloco titulo={`Notas fiscais (${visao.painel.ultimasNotas.length})`}>
        <Tabela
          colunas={['Documento', 'Emissão', 'Origem', 'Valor']}
          linhas={notas(visao.painel)}
          vazio="Nenhuma nota fiscal emitida para este cliente."
        />
      </Bloco>
      <Bloco titulo={`Títulos em aberto (${visao.painel.carteira.titulosEmAberto.length})`}>
        <Tabela
          colunas={['Título', 'Vencimento', 'Saldo', 'Situação']}
          linhas={titulos(visao.painel)}
          vazio="Nenhum título em aberto em nome deste cliente."
        />
      </Bloco>
      <Bloco titulo={`Títulos pagos (${visao.painel.carteira.pagamentos.length})`}>
        <Tabela
          colunas={['Título', 'Pago em', 'Valor', 'Pontualidade']}
          linhas={pagamentos(visao.painel)}
          vazio="Nenhum pagamento registrado."
        />
      </Bloco>
      <Bloco titulo="Arquivos anexados">
        <p className="text-body-sm text-stone">
          Anexar arquivo ao cadastro (contrato, ficha assinada, procuração) ainda não existe no
          Synapse. Está anotado em docs/CLIENTES.md, nas pendências.
        </p>
      </Bloco>
    </div>
  );
}

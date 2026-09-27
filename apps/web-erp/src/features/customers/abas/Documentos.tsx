import { classesDaLinha, DataGridCabecalho, DataGridCelula, Status, Text } from '@synapse/sdl';
import type { PainelDeAnaliseDeCredito } from '@synapse/types';
import { CircleCheck, FileText, Hourglass, Paperclip } from 'lucide-react';
import type { ReactNode } from 'react';
import { CelulaDeDinheiro } from '../../../components/datagrid/CelulaDeDinheiro';
import { Bloco } from '../campos';
import { formatarData, formatarMoeda } from '../formato';
import type { PropsDaAba } from './aba';
import type { VisaoDeCredito } from '../useVisaoDeCredito';

/** Aba Documentos: o que existe em nome deste cliente — notas fiscais emitidas
 *  e títulos a receber. Vem do próprio sistema; nada é digitado aqui.
 *
 *  Anexar arquivo (contrato, ficha assinada, procuração) ainda não existe no
 *  Synapse, e a aba diz isso em vez de oferecer um botão que não grava. */

/** As três tabelas desta aba são só leitura (sem abrir linha, sem ação): a
 *  linha não é clicável, e o dinheiro fica à direita em `CelulaDeDinheiro`,
 *  como em toda tabela da fundação de DataGrid. */
interface Coluna {
  readonly id: string;
  readonly rotulo: string;
  readonly direita?: boolean;
}

function Tabela({
  colunas,
  quantidade,
  vazio,
  children,
}: {
  readonly colunas: readonly Coluna[];
  readonly quantidade: number;
  readonly vazio: string;
  readonly children: ReactNode;
}) {
  if (quantidade === 0) return <p className="text-body-sm text-stone">{vazio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left">
        <thead>
          <tr className="border-hairline-light border-b">
            {colunas.map((coluna) => (
              <DataGridCabecalho
                key={coluna.id}
                id={coluna.id}
                rotulo={coluna.rotulo}
                alinhamento={coluna.direita ? 'direita' : 'esquerda'}
              />
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const LINHA = classesDaLinha({ clicavel: false, focoComAnel: false });

const Dado = ({ children }: { readonly children: ReactNode }) => (
  <DataGridCelula papel="data" truncar={false}>
    <Text variant="dado">{children}</Text>
  </DataGridCelula>
);

const Principal = ({ children }: { readonly children: ReactNode }) => (
  <DataGridCelula papel="primary" truncar={false}>
    <Text variant="corpo" className="font-medium">
      {children}
    </Text>
  </DataGridCelula>
);

const Secundario = ({ children }: { readonly children: ReactNode }) => (
  <DataGridCelula papel="secondary" truncar={false}>
    <Text variant="corpoSecundario">{children}</Text>
  </DataGridCelula>
);

const Dinheiro = ({ centavos }: { readonly centavos: number }) => (
  <CelulaDeDinheiro truncar={false} valorFormatado={formatarMoeda(centavos)} />
);

function Notas({ painel }: { readonly painel: PainelDeAnaliseDeCredito }) {
  return (
    <Tabela
      colunas={[
        { id: 'documento', rotulo: 'Documento' },
        { id: 'emissao', rotulo: 'Emissão' },
        { id: 'origem', rotulo: 'Origem' },
        { id: 'valor', rotulo: 'Valor', direita: true },
      ]}
      quantidade={painel.ultimasNotas.length}
      vazio="Nenhuma nota fiscal emitida para este cliente."
    >
      {painel.ultimasNotas.map((nota) => (
        <tr key={`${nota.serie}-${nota.numero}`} className={LINHA}>
          <Principal>NF {nota.numero}</Principal>
          <Dado>{formatarData(nota.emitidaEm)}</Dado>
          <Secundario>{nota.pedidoNumero ? `Pedido ${nota.pedidoNumero}` : '—'}</Secundario>
          <Dinheiro centavos={nota.totalCentavos ?? 0} />
        </tr>
      ))}
    </Tabela>
  );
}

function TitulosEmAberto({ painel }: { readonly painel: PainelDeAnaliseDeCredito }) {
  const { titulosEmAberto } = painel.carteira;
  return (
    <Tabela
      colunas={[
        { id: 'titulo', rotulo: 'Título' },
        { id: 'vencimento', rotulo: 'Vencimento' },
        { id: 'saldo', rotulo: 'Saldo', direita: true },
        { id: 'situacao', rotulo: 'Situação' },
      ]}
      quantidade={titulosEmAberto.length}
      vazio="Nenhum título em aberto em nome deste cliente."
    >
      {titulosEmAberto.map((titulo) => (
        <tr key={titulo.id} className={LINHA}>
          <Dado>
            {titulo.numero} · {titulo.parcela}
          </Dado>
          <Dado>{formatarData(titulo.vencimento)}</Dado>
          <Dinheiro centavos={titulo.saldoCentavos} />
          <DataGridCelula papel="status" truncar={false}>
            {titulo.diasDeAtraso > 0 ? (
              <Status tone="vencido">Vencido há {titulo.diasDeAtraso} dia(s)</Status>
            ) : (
              <Status tone="neutro">A vencer</Status>
            )}
          </DataGridCelula>
        </tr>
      ))}
    </Tabela>
  );
}

const pontualidade = (dias: number): string =>
  dias > 0
    ? `${dias} dia(s) após o vencimento`
    : dias < 0
      ? `${Math.abs(dias)} dia(s) antes`
      : 'No vencimento';

function TitulosPagos({ painel }: { readonly painel: PainelDeAnaliseDeCredito }) {
  const { pagamentos } = painel.carteira;
  return (
    <Tabela
      colunas={[
        { id: 'titulo', rotulo: 'Título' },
        { id: 'pago-em', rotulo: 'Pago em' },
        { id: 'valor', rotulo: 'Valor', direita: true },
        { id: 'pontualidade', rotulo: 'Pontualidade' },
      ]}
      quantidade={pagamentos.length}
      vazio="Nenhum pagamento registrado."
    >
      {/* Um título pode ter mais de uma baixa parcial: o id sozinho não é chave. */}
      {pagamentos.map((pagamento, indice) => (
        <tr key={`${pagamento.tituloId}-${indice}`} className={LINHA}>
          <Dado>
            {pagamento.numero} · {pagamento.parcela}
          </Dado>
          <Dado>{formatarData(pagamento.pagoEm)}</Dado>
          <Dinheiro centavos={pagamento.valorCentavos} />
          <Secundario>{pontualidade(pagamento.diasDoPagamento)}</Secundario>
        </tr>
      ))}
    </Tabela>
  );
}

export function AbaDocumentos({ cliente, visao }: PropsDaAba & { readonly visao: VisaoDeCredito }) {
  if (!cliente) {
    return (
      <Bloco titulo="Documentos" icone={FileText} descricao="Notas e títulos em nome deste cliente">
        <p className="text-body-sm text-stone">
          Os documentos aparecem depois de salvar o cadastro: nota fiscal emitida e título a receber
          nascem dos pedidos deste cliente.
        </p>
      </Bloco>
    );
  }
  if (visao.status === 'sem-permissao') {
    return (
      <Bloco titulo="Documentos" icone={FileText} descricao="Notas e títulos em nome deste cliente">
        <p className="text-body-sm text-stone">
          Notas fiscais e títulos deste cliente exigem permissão do financeiro
          (financeiro.visualizar). Seu usuário edita o cadastro, mas não vê o financeiro.
        </p>
      </Bloco>
    );
  }
  if (visao.status !== 'pronto') {
    return (
      <Bloco titulo="Documentos" icone={FileText} descricao="Notas e títulos em nome deste cliente">
        <p className="text-body-sm text-stone">
          {visao.status === 'erro' ? visao.mensagem : 'Carregando documentos…'}
        </p>
      </Bloco>
    );
  }

  return (
    <div className="grid gap-4">
      <Bloco
        titulo={`Notas fiscais (${visao.painel.ultimasNotas.length})`}
        icone={FileText}
        descricao="Emitidas em nome deste cliente"
      >
        <Notas painel={visao.painel} />
      </Bloco>
      <Bloco
        titulo={`Títulos em aberto (${visao.painel.carteira.titulosEmAberto.length})`}
        icone={Hourglass}
        descricao="A receber, parcela por parcela"
      >
        <TitulosEmAberto painel={visao.painel} />
      </Bloco>
      <Bloco
        titulo={`Títulos pagos (${visao.painel.carteira.pagamentos.length})`}
        icone={CircleCheck}
        descricao="Pagamentos e pontualidade"
      >
        <TitulosPagos painel={visao.painel} />
      </Bloco>
      <Bloco
        titulo="Arquivos anexados"
        icone={Paperclip}
        descricao="Ainda não disponível no Synapse"
      >
        <p className="text-body-sm text-stone">
          Anexar arquivo ao cadastro (contrato, ficha assinada, procuração) ainda não existe no
          Synapse. Está anotado em docs/CLIENTES.md, nas pendências.
        </p>
      </Bloco>
    </div>
  );
}

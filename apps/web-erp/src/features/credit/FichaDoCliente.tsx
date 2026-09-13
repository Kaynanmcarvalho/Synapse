import type { PainelDeAnaliseDeCredito } from '@synapse/types';
import { CircleAlert } from 'lucide-react';
import { Total } from './Cartao';
import { HistoricoDoCliente, type AbaDoHistorico } from './HistoricoDoCliente';
import { PagamentosDoCliente } from './PagamentosDoCliente';
import { PedidosEmAnalise } from './PedidosEmAnalise';
import { TitulosEmAberto } from './TitulosEmAberto';
import { formatarMoeda } from './analise';
import type { EstadoDoPainel } from './useAnaliseDeCredito';

function Resumo({ dados }: { readonly dados: PainelDeAnaliseDeCredito }) {
  const { cliente, carteira, totalEmAnaliseCentavos } = dados;
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 pt-4">
      {cliente.documento && (
        <span className="flex flex-col">
          <span className="text-caption text-stone">CNPJ / CPF</span>
          <strong className="text-body-md text-ink font-semibold">{cliente.documento}</strong>
        </span>
      )}
      <Total rotulo="Em análise" valor={formatarMoeda(totalEmAnaliseCentavos)} />
      <Total
        rotulo="Vencido"
        valor={formatarMoeda(carteira.totalVencidoCentavos)}
        tom={carteira.totalVencidoCentavos > 0 ? 'alerta' : 'neutro'}
      />
      <Total rotulo="A vencer" valor={formatarMoeda(carteira.totalAVencerCentavos)} />
      <Total
        rotulo="Total pago"
        valor={formatarMoeda(carteira.totalPagoCentavos)}
        tom={carteira.totalPagoCentavos > 0 ? 'positivo' : 'neutro'}
      />
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="grid h-full gap-4 p-4 lg:grid-cols-12 lg:grid-rows-2">
      {[0, 1, 2, 3].map((indice) => (
        <div
          key={indice}
          className={`bg-surface-soft min-h-40 animate-pulse rounded-2xl ${
            indice % 2 === 0 ? 'lg:col-span-7' : 'lg:col-span-5'
          }`}
        />
      ))}
    </div>
  );
}

function Aviso({ texto }: { readonly texto: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 p-8">
      <span className="bg-surface-soft text-accent-danger flex h-11 w-11 items-center justify-center rounded-full">
        <CircleAlert size={20} aria-hidden="true" />
      </span>
      <p className="text-body-md text-ink font-semibold">Não foi possível abrir a análise</p>
      <p className="text-body-sm text-mute">{texto}</p>
    </div>
  );
}

/** As quatro partes da ficha, na posicao combinada: pedidos em analise no
 *  centro, historico em cima a direita, titulos a receber embaixo a esquerda e
 *  titulos pagos embaixo a direita. Cada parte rola por dentro, entao a janela
 *  inteira cabe na tela mesmo com muito registro. */
export function FichaDoCliente({
  painel,
  aba,
  onTrocarAba,
  abertos,
  onAlternar,
}: {
  readonly painel: EstadoDoPainel;
  readonly aba: AbaDoHistorico;
  readonly onTrocarAba: (aba: AbaDoHistorico) => void;
  readonly abertos: ReadonlySet<string>;
  readonly onAlternar: (id: string) => void;
}) {
  if (painel.status === 'carregando' || painel.status === 'vazio') return <Esqueleto />;
  if (painel.status === 'erro') return <Aviso texto={painel.mensagem} />;

  const { dados } = painel;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Resumo dados={dados} />
      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-12 lg:grid-rows-[1.15fr_1fr]">
        <div
          style={{ animationDelay: '0ms' }}
          className="animate-subir min-h-0 min-w-0 motion-reduce:animate-none lg:col-span-7"
        >
          <PedidosEmAnalise
            pedidos={dados.pedidosEmAnalise}
            totalCentavos={dados.totalEmAnaliseCentavos}
            abertos={abertos}
            onAlternar={onAlternar}
          />
        </div>
        <div
          style={{ animationDelay: '60ms' }}
          className="animate-subir min-h-0 min-w-0 motion-reduce:animate-none lg:col-span-5"
        >
          <HistoricoDoCliente
            aba={aba}
            onTrocarAba={onTrocarAba}
            pedidos={dados.ultimosPedidos}
            notas={dados.ultimasNotas}
          />
        </div>
        <div
          style={{ animationDelay: '120ms' }}
          className="animate-subir min-h-0 min-w-0 motion-reduce:animate-none lg:col-span-7"
        >
          <TitulosEmAberto carteira={dados.carteira} />
        </div>
        <div
          style={{ animationDelay: '180ms' }}
          className="animate-subir min-h-0 min-w-0 motion-reduce:animate-none lg:col-span-5"
        >
          <PagamentosDoCliente carteira={dados.carteira} />
        </div>
      </div>
    </div>
  );
}

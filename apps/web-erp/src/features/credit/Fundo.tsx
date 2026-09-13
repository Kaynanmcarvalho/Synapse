import {
  ArrowRight,
  ListChecks,
  Maximize2,
  MousePointerClick,
  Move,
  UserSearch,
} from 'lucide-react';
import { formatarMoeda } from './analise';
import { totaisDaFila } from './fila/colunas';
import type { EstadoDaFila } from './useAnaliseDeCredito';

const DICAS: ReadonlyArray<{
  readonly icone: typeof Move;
  readonly titulo: string;
  readonly texto: string;
}> = [
  {
    icone: Move,
    titulo: 'Arraste pela barra de título',
    texto: 'Cada janela fica onde você deixou — o sistema guarda por usuário.',
  },
  {
    icone: Maximize2,
    titulo: 'Estique pelas laterais',
    texto: 'Dois cliques no título ocupam a tela inteira e voltam ao tamanho anterior.',
  },
  {
    icone: MousePointerClick,
    titulo: 'Dois cliques ordenam a coluna',
    texto: 'Cliente de A a Z, valor do menor ao maior. O segundo duplo clique inverte.',
  },
];

function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = 'neutro',
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly detalhe: string;
  readonly tom?: 'neutro' | 'alerta';
}) {
  return (
    <div className="border-hairline-light rounded-2xl border px-5 py-4">
      <p className="text-caption text-stone uppercase tracking-[0.1em]">{rotulo}</p>
      <p
        className={`font-display mt-2 text-[28px] tabular-nums leading-none ${
          tom === 'alerta' ? 'text-accent-danger' : 'text-ink'
        }`}
      >
        {valor}
      </p>
      <p className="text-body-sm text-mute mt-2">{detalhe}</p>
    </div>
  );
}

/** O que aparece atras das janelas: quem chegou na fila, quanto pesa e como a
 *  tela funciona. E a primeira leitura do dia — precisa dizer o essencial sem
 *  obrigar a abrir nada. */
export function Fundo({
  fila,
  aoAbrirFila,
  aoAbrirCliente,
}: {
  readonly fila: EstadoDaFila;
  readonly aoAbrirFila: () => void;
  readonly aoAbrirCliente: (() => void) | null;
}) {
  const totais = fila.status === 'pronto' ? totaisDaFila(fila.pedidos) : null;

  return (
    <main className="mx-auto w-full max-w-[1080px] px-6 py-14 lg:py-20">
      <p className="text-caption text-stone uppercase tracking-[0.16em]">Financeiro</p>
      <h1 className="font-display text-ink mt-3 text-[40px] font-medium leading-[1.1] tracking-[-0.6px] sm:text-[48px]">
        Análise de crédito
      </h1>
      <p className="text-body-lg text-mute mt-4 max-w-[60ch]">
        Todo pedido enviado pelos vendedores — do desktop ou do celular — espera aqui a liberação do
        financeiro. Abra a fila, escolha um pedido e a ficha do cliente aparece por cima, com
        pedidos, notas, títulos a receber e histórico de pagamento.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={aoAbrirFila}
          className="bg-canvas-dark text-button-md hover:bg-charcoal inline-flex h-12 items-center gap-2 rounded-full px-7 text-white transition"
        >
          <ListChecks size={17} aria-hidden="true" /> Abrir a fila de pedidos
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        {aoAbrirCliente && (
          <button
            type="button"
            onClick={aoAbrirCliente}
            className="bg-surface-soft text-button-md text-ink inline-flex h-12 items-center gap-2 rounded-full px-6 transition hover:bg-[#ececee]"
          >
            <UserSearch size={17} aria-hidden="true" /> Voltar à ficha do cliente
          </button>
        )}
      </div>

      <section aria-label="Resumo da fila" className="mt-12 grid gap-4 sm:grid-cols-3">
        <Indicador
          rotulo="Na fila"
          valor={totais ? String(totais.pedidos) : '—'}
          detalhe={totais ? `${totais.clientes} cliente(s) aguardando` : 'Carregando a fila…'}
        />
        <Indicador
          rotulo="Valor em análise"
          valor={totais ? formatarMoeda(totais.valorCentavos) : '—'}
          detalhe="Soma dos pedidos que esperam liberação"
        />
        <Indicador
          rotulo="Vencido desses clientes"
          valor={totais ? formatarMoeda(totais.vencidoCentavos) : '—'}
          detalhe="Dívida em aberto de quem está na fila"
          tom={totais && totais.vencidoCentavos > 0 ? 'alerta' : 'neutro'}
        />
      </section>

      <section
        aria-label="Como usar as janelas"
        className="border-hairline-light mt-12 border-t pt-8"
      >
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-3">
          {DICAS.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo}>
              <dt className="text-body-md text-ink flex items-center gap-2 font-semibold">
                <Icone size={16} aria-hidden="true" className="text-stone" />
                {titulo}
              </dt>
              <dd className="text-body-sm text-mute mt-1.5">{texto}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}

import {
  ArrowRight,
  Boxes,
  CircleAlert,
  CircleCheck,
  FileInput,
  FileText,
  Gauge,
  PackageSearch,
  Receipt,
  RotateCw,
  ScanLine,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUsuario } from '../../app/auth/AuthContext';
import { todosOsItens } from '../../app/menu/menu.utils';
import { ROTAS } from '../../app/rotas';
import { useShell } from '../../app/shell/ShellContext';
import type { Aviso } from './avisos';
import { type EstadoDosAvisos, useAvisos } from './useAvisos';

/** As rotinas mais usadas no balcao e na retaguarda. Vem do menu: se o tenant
 *  nao tem o modulo, o atalho some junto com a opcao. */
const ACESSO_RAPIDO: ReadonlyArray<{ readonly rotulo: string; readonly icone: LucideIcon }> = [
  { rotulo: 'Venda PDV NFC-e', icone: ScanLine },
  { rotulo: 'Lançamento de Nota Fiscal de Entrada', icone: FileInput },
  { rotulo: 'Balanço de Estoque', icone: PackageSearch },
  { rotulo: 'Boletos', icone: Receipt },
  { rotulo: 'Cadastro de Produtos', icone: Boxes },
  { rotulo: 'Controle de Notas Fiscais Emitidas para meu CNPJ', icone: FileText },
];

const saudacao = (hora: number): string => {
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

const TITULO_DE_SECAO = 'font-display text-heading-md text-ink';

function Saudacao({ nome }: { readonly nome: string }) {
  const agora = new Date();
  const data = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(agora);

  return (
    <header>
      <p className="text-body-sm text-stone">{data.charAt(0).toUpperCase() + data.slice(1)}</p>
      <h1 className="font-display text-ink sm:text-display-lg mt-3 text-[36px] font-medium leading-none tracking-[-0.6px]">
        {saudacao(agora.getHours())}, {nome}.
      </h1>
    </header>
  );
}

function BarraDeBusca() {
  const { abrirBusca } = useShell();
  return (
    <button
      type="button"
      onClick={abrirBusca}
      className="bg-surface-soft mt-8 flex h-14 w-full items-center gap-3 rounded-full px-5 text-left transition hover:bg-[#ececee]"
    >
      <Search size={20} className="text-stone" aria-hidden="true" />
      <span className="text-body-lg text-stone flex-1">O que você precisa?</span>
      <kbd className="bg-canvas-light text-caption text-ash hidden rounded-full px-2.5 py-1 font-sans sm:inline">
        Ctrl K
      </kbd>
    </button>
  );
}

function CartaoDeAviso({ aviso }: { readonly aviso: Aviso }) {
  return (
    <Link
      to={aviso.caminho}
      className="border-hairline-light bg-canvas-light hover:border-hairline-strong group flex flex-col rounded-2xl border p-6 transition"
    >
      <span className="text-body-sm text-mute flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${aviso.tom === 'critico' ? 'bg-accent-danger' : 'bg-accent-warning'}`}
        />
        {aviso.titulo}
      </span>
      <span className="font-display text-heading-lg text-ink mt-4">{aviso.valor}</span>
      <span className="text-body-sm text-mute mt-1">{aviso.detalhe}</span>
      <span className="text-button-sm text-ink mt-6 inline-flex items-center gap-1.5">
        Ver
        <ArrowRight
          size={15}
          aria-hidden="true"
          className="transition group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

function EstadoUnico({
  icone: Icone,
  titulo,
  texto,
  acao,
}: {
  readonly icone: LucideIcon;
  readonly titulo: string;
  readonly texto: string;
  readonly acao?: { readonly rotulo: string; readonly executar: () => void };
}) {
  return (
    <div className="border-hairline-light flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center">
      <span className="bg-surface-soft text-ink flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
        <Icone size={20} aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="text-body-md text-ink block font-semibold">{titulo}</span>
        <span className="text-body-sm text-mute block">{texto}</span>
      </span>
      {acao && (
        <button
          type="button"
          onClick={acao.executar}
          className="bg-surface-soft text-button-sm text-ink inline-flex h-10 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]"
        >
          <RotateCw size={15} aria-hidden="true" /> {acao.rotulo}
        </button>
      )}
    </div>
  );
}

function SecaoDeAvisos({
  estado,
  onRecarregar,
}: {
  readonly estado: EstadoDosAvisos;
  readonly onRecarregar: () => void;
}) {
  return (
    <section
      className="mt-14"
      aria-labelledby="titulo-avisos"
      aria-busy={estado.status === 'carregando'}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-avisos" className={TITULO_DE_SECAO}>
          Avisos
        </h2>
        {estado.status === 'pronto' && estado.calculando && (
          <span className="text-body-sm text-stone">
            Indicadores financeiros em cálculo — voltam em até 5 minutos.
          </span>
        )}
      </div>
      <div className="mt-5">
        {estado.status === 'carregando' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((indice) => (
              <div key={indice} className="bg-surface-soft h-[178px] animate-pulse rounded-2xl" />
            ))}
          </div>
        )}
        {estado.status === 'erro' && (
          <EstadoUnico
            icone={CircleAlert}
            titulo="Não foi possível carregar os avisos"
            texto="Confira sua conexão com o servidor do Synapse."
            acao={{ rotulo: 'Tentar de novo', executar: onRecarregar }}
          />
        )}
        {estado.status === 'pronto' && estado.avisos.length === 0 && (
          <EstadoUnico
            icone={CircleCheck}
            titulo="Nenhum aviso agora"
            texto="Contas a receber, estoque, lotes e manifestos estão em dia."
          />
        )}
        {estado.status === 'pronto' && estado.avisos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {estado.avisos.map((aviso) => (
              <CartaoDeAviso key={aviso.id} aviso={aviso} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AcessoRapido() {
  const { menus } = useShell();
  const disponiveis = todosOsItens(menus).filter((item) => item.situacao === 'disponivel');
  const atalhos = [
    ...ACESSO_RAPIDO.flatMap(({ rotulo, icone }) => {
      const item = disponiveis.find((candidato) => candidato.rotulo === rotulo);
      return item
        ? [
            {
              rotulo,
              caminho: item.caminho,
              local: item.trilha.slice(0, -1).join(' › '),
              atalho: item.atalho?.rotulo,
              icone,
            },
          ]
        : [];
    }),
    {
      rotulo: 'Painel de Controle',
      caminho: ROTAS.painelDeControle,
      local: 'Indicadores do período',
      atalho: undefined,
      icone: Gauge,
    },
  ];

  return (
    <section className="mt-14" aria-labelledby="titulo-acesso-rapido">
      <h2 id="titulo-acesso-rapido" className={TITULO_DE_SECAO}>
        Acesso rápido
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {atalhos.map(({ rotulo, caminho, local, atalho, icone: Icone }) => (
          <Link
            key={rotulo}
            to={caminho}
            className="border-hairline-light hover:bg-surface-soft group flex items-center gap-4 rounded-2xl border p-5 transition"
          >
            <span className="bg-surface-soft text-ink group-hover:bg-canvas-light flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition">
              <Icone size={19} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-body-md text-ink block truncate font-semibold">{rotulo}</span>
              <span className="text-body-sm text-stone block truncate">{local}</span>
            </span>
            {atalho && (
              <kbd className="border-hairline-light text-caption text-ash hidden rounded-full border px-2 py-0.5 font-sans xl:inline">
                {atalho}
              </kbd>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Tela inicial da retaguarda: o que precisa de atencao hoje e o caminho curto
 *  para as rotinas do dia — no lugar do painel de indicadores com filtros, que
 *  continua existindo como "Painel de Controle". */
export function HomeScreen() {
  const usuario = useUsuario();
  const { menus } = useShell();
  const caminhoDoMdfe =
    todosOsItens(menus).find((item) => item.rotulo === 'Emissor CT-e / MDF-e')?.caminho ??
    ROTAS.inicio;
  const { estado, recarregar } = useAvisos(caminhoDoMdfe);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Saudacao nome={usuario.nome.split(' ')[0] || usuario.nome} />
      <BarraDeBusca />
      <SecaoDeAvisos estado={estado} onRecarregar={() => void recarregar()} />
      <AcessoRapido />
    </main>
  );
}

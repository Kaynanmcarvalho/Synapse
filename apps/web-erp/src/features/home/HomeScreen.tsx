import { Button, Divider, Kbd, Status, Surface, Text } from '@synapse/sdl';
import { ArrowRight, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUsuario } from '../../app/auth/AuthContext';
import { todosOsItens } from '../../app/menu/menu.utils';
import { ROTAS } from '../../app/rotas';
import { useShell } from '../../app/shell/ShellContext';
import { ACESSO_RAPIDO } from './acessoRapido';
import type { Aviso } from './avisos';
import { type EstadoDosAvisos, useAvisos } from './useAvisos';

const saudacao = (hora: number): string => {
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

/** Uma linha, nao um bloco: a saudacao e contexto, nao e o conteudo da Home. */
function Cabecalho({ nome }: { readonly nome: string }) {
  const agora = new Date();
  const data = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(agora);

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-4">
      <Text variant="corpo" tone="apoio" className="capitalize">
        {data}
      </Text>
      <Text variant="corpo" tone="sutil" aria-hidden="true">
        ·
      </Text>
      <Text variant="corpo">
        {saudacao(agora.getHours())}, {nome}.
      </Text>
    </div>
  );
}

function LinhaDeExcecao({ aviso }: { readonly aviso: Aviso }) {
  return (
    <Link
      to={aviso.caminho}
      className="focus-visible:ring-primary/70 rounded-minimo hover:bg-surface-hover duration-instantaneo group grid grid-cols-[3.5rem_1fr_auto_1rem] items-center gap-x-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset"
    >
      <Text variant="dado" className="text-heading-sm text-right">
        {aviso.valor}
      </Text>
      <Status
        tone={aviso.tom === 'critico' ? 'perigo' : 'atencao'}
        variant="dot"
        className="min-w-0"
      >
        <span className="truncate">{aviso.titulo}</span>
      </Status>
      <Text variant="corpoSecundario" className="hidden whitespace-nowrap sm:block">
        {aviso.detalhe}
      </Text>
      <ArrowRight
        size={15}
        aria-hidden="true"
        className="text-stone duration-instantaneo justify-self-end transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function SecaoDeExcecoes({
  estado,
  onRecarregar,
}: {
  readonly estado: EstadoDosAvisos;
  readonly onRecarregar: () => void;
}) {
  return (
    <section aria-labelledby="titulo-excecoes" aria-busy={estado.status === 'carregando'}>
      <Text id="titulo-excecoes" variant="tituloSecao" as="h2">
        Requer atenção
      </Text>

      {estado.status === 'carregando' && (
        <div className="mt-4 space-y-2" aria-hidden="true">
          {[0, 1, 2].map((indice) => (
            <div key={indice} className="bg-surface-hover rounded-minimo h-11 animate-pulse" />
          ))}
        </div>
      )}

      {estado.status === 'erro' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 py-3">
          <Text variant="corpoSecundario">Não foi possível carregar os avisos agora.</Text>
          <Button variant="quiet" density="compacta" onClick={onRecarregar}>
            <RotateCw size={14} aria-hidden="true" /> Tentar de novo
          </Button>
        </div>
      )}

      {estado.status === 'pronto' && (
        <>
          {estado.algoIndisponivel && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Text variant="legenda" tone="apoio">
                Algumas informações podem estar indisponíveis agora.
              </Text>
              <button
                type="button"
                onClick={onRecarregar}
                className="text-caption text-ink underline-offset-2 hover:underline"
              >
                Tentar de novo
              </button>
            </div>
          )}

          <div className="mt-3">
            {estado.avisos.length > 0 &&
              estado.avisos.map((aviso, indice) => (
                <div key={aviso.id}>
                  {indice > 0 && <Divider />}
                  <LinhaDeExcecao aviso={aviso} />
                </div>
              ))}
            {estado.avisos.length === 0 && !estado.algoIndisponivel && (
              <Text variant="corpoSecundario" className="block py-3">
                Nenhuma pendência crítica no momento.
              </Text>
            )}
            {estado.avisos.length === 0 && estado.algoIndisponivel && (
              <Text variant="corpoSecundario" className="block py-3">
                Não foi possível confirmar todas as pendências agora.
              </Text>
            )}
          </div>

          {estado.calculando && (
            <Text variant="legenda" tone="apoio" className="mt-2 block">
              Indicadores financeiros em cálculo — voltam em até 5 minutos.
            </Text>
          )}
        </>
      )}
    </section>
  );
}

function AcessoRapido() {
  const { menus } = useShell();
  const disponiveis = todosOsItens(menus).filter((item) => item.situacao === 'disponivel');
  const atalhos = [
    ...ACESSO_RAPIDO.flatMap(({ id, nome }) => {
      const item = disponiveis.find((candidato) => candidato.id === id);
      return item
        ? [{ rotulo: nome ?? item.rotulo, caminho: item.caminho, atalho: item.atalho?.rotulo }]
        : [];
    }),
    {
      rotulo: 'Painel de Controle',
      caminho: ROTAS.painelDeControle,
      atalho: undefined,
    },
  ];

  return (
    <section aria-labelledby="titulo-acesso-rapido">
      <Text id="titulo-acesso-rapido" variant="tituloSecao" as="h2">
        Acesso rápido
      </Text>
      <div className="mt-3">
        {atalhos.map(({ rotulo, caminho, atalho }, indice) => (
          <div key={caminho}>
            {indice > 0 && <Divider />}
            <Link
              to={caminho}
              className="focus-visible:ring-primary/70 rounded-minimo hover:bg-surface-hover duration-instantaneo grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset"
            >
              <Text variant="legenda" tone="apoio" className="tabular-nums">
                {String(indice + 1).padStart(2, '0')}
              </Text>
              <Text variant="corpo" className="truncate">
                {rotulo}
              </Text>
              {atalho && <Kbd className="hidden sm:inline-flex">{atalho}</Kbd>}
            </Link>
          </div>
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
    <Surface
      variant="pagina"
      as="main"
      className="max-w-conteudo-trabalho mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <Cabecalho nome={usuario.nome.split(' ')[0] || usuario.nome} />
      <Divider />
      <div className="py-6">
        <SecaoDeExcecoes estado={estado} onRecarregar={() => void recarregar()} />
      </div>
      <Divider />
      <div className="py-6">
        <AcessoRapido />
      </div>
    </Surface>
  );
}

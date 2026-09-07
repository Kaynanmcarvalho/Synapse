/* eslint-disable max-lines, max-lines-per-function */
import { PERMISSIONS, type Permission, type PermissionGrant } from '@synapse/types';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  criarCargo,
  excluirCargo,
  listarCargos,
  salvarCargo,
  type EntradaDeCargo,
  type RoleView,
} from './roles.api';

/** O catalogo e uma lista fechada de `modulo.operacao`: a tela agrupa pelo
 *  prefixo em vez de manter uma segunda lista de modulos, que sairia do ar na
 *  primeira permissao nova. */
const MODULOS: ReadonlyArray<readonly [string, readonly Permission[]]> = Object.entries(
  PERMISSIONS.reduce<Record<string, Permission[]>>((agrupado, permission) => {
    const modulo = permission.slice(0, permission.indexOf('.'));
    agrupado[modulo] = [...(agrupado[modulo] ?? []), permission];
    return agrupado;
  }, {}),
);

const listaDeIds = (texto: string): string[] =>
  texto
    .split(',')
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);

interface EstadoDoFormulario {
  readonly cargo: RoleView | null;
  readonly nome: string;
  readonly grants: readonly PermissionGrant[];
}

const vazio: EstadoDoFormulario = { cargo: null, nome: '', grants: [] };

function Cabecalho({ aoNovo }: { readonly aoNovo: () => void }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-slate-950 dark:text-slate-100">
          Cargos e permissões
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada permissão é verificada no backend a cada requisição. Cargos padrão são só de leitura
          — para um recorte diferente, crie um cargo.
        </p>
      </div>
      <button
        type="button"
        onClick={aoNovo}
        className="h-10 rounded-xl bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800"
      >
        Novo cargo
      </button>
    </header>
  );
}

function ListaDeCargos({
  cargos,
  aoAbrir,
  aoExcluir,
}: {
  readonly cargos: readonly RoleView[];
  readonly aoAbrir: (cargo: RoleView) => void;
  readonly aoExcluir: (cargo: RoleView) => void;
}) {
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900">
      {cargos.map((cargo) => (
        <li key={cargo.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
              {cargo.name}
              {cargo.isCustom ? null : (
                <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  padrão
                </span>
              )}
            </p>
            <p className="truncate text-xs text-slate-400">
              {cargo.permissions.length} permissã{cargo.permissions.length === 1 ? 'o' : 'es'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => aoAbrir(cargo)}
              className="h-9 rounded-lg px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300"
            >
              {cargo.isCustom ? 'Editar' : 'Ver'}
            </button>
            {cargo.isCustom && (
              <button
                type="button"
                onClick={() => aoExcluir(cargo)}
                className="h-9 rounded-lg px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Excluir
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LinhaDePermissao({
  permission,
  grant,
  somenteLeitura,
  aoAlternar,
  aoRecortar,
}: {
  readonly permission: Permission;
  readonly grant: PermissionGrant | undefined;
  readonly somenteLeitura: boolean;
  readonly aoAlternar: () => void;
  readonly aoRecortar: (texto: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex min-w-[15rem] items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={grant !== undefined}
          onChange={aoAlternar}
          disabled={somenteLeitura}
          className="h-4 w-4 rounded border-slate-300"
        />
        <code className="text-slate-700 dark:text-slate-300">{permission}</code>
      </label>

      {grant && (
        <input
          value={(grant.scope?.branchIds ?? []).join(', ')}
          onChange={(evento) => aoRecortar(evento.target.value)}
          disabled={somenteLeitura}
          placeholder="todas as filiais"
          aria-label={`Filiais onde ${permission} vale`}
          className="h-8 w-56 rounded-lg border border-slate-200 px-2 text-xs outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 dark:border-slate-700"
        />
      )}
    </div>
  );
}

export function RolesScreen() {
  const [cargos, setCargos] = useState<readonly RoleView[]>([]);
  const [form, setForm] = useState<EstadoDoFormulario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const nomeId = useId();

  const carregar = async () => {
    setCarregando(true);
    try {
      setCargos(await listarCargos());
      setErro(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Falha ao carregar os cargos');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const porPermissao = useMemo(
    () => new Map((form?.grants ?? []).map((grant) => [grant.permission, grant])),
    [form],
  );

  const somenteLeitura = form?.cargo !== null && form?.cargo !== undefined && !form.cargo.isCustom;

  const alternar = (permission: Permission) =>
    setForm((atual) =>
      atual === null
        ? atual
        : {
            ...atual,
            grants: porPermissao.has(permission)
              ? atual.grants.filter((grant) => grant.permission !== permission)
              : [...atual.grants, { permission }],
          },
    );

  const recortar = (permission: Permission, texto: string) =>
    setForm((atual) =>
      atual === null
        ? atual
        : {
            ...atual,
            grants: atual.grants.map((grant) => {
              if (grant.permission !== permission) return grant;
              const branchIds = listaDeIds(texto);
              // Campo vazio volta a ser "sem recorte": scope ausente vale em
              // qualquer filial, e uma lista vazia nao diria isso.
              return branchIds.length === 0 ? { permission } : { permission, scope: { branchIds } };
            }),
          },
    );

  const enviar = async () => {
    if (form === null) return;
    if (form.grants.length === 0) {
      setErro('O cargo precisa de ao menos uma permissão.');
      return;
    }
    setSalvando(true);
    const entrada: EntradaDeCargo = { name: form.nome.trim(), permissions: form.grants };
    try {
      if (form.cargo) await salvarCargo(form.cargo.id, entrada);
      else await criarCargo(entrada);
      setForm(null);
      setErro(null);
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Falha ao salvar o cargo');
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (cargo: RoleView) => {
    if (!window.confirm(`Excluir "${cargo.name}"? Quem tiver este cargo perde essas permissões.`)) {
      return;
    }
    try {
      await excluirCargo(cargo.id);
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Falha ao excluir o cargo');
    }
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <Cabecalho
        aoNovo={() => {
          setForm(vazio);
          setErro(null);
        }}
      />

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando cargos…</p>
      ) : form === null ? (
        <ListaDeCargos
          cargos={cargos}
          aoAbrir={(cargo) => setForm({ cargo, nome: cargo.name, grants: cargo.permissions })}
          aoExcluir={(cargo) => void remover(cargo)}
        />
      ) : (
        <form
          className="flex flex-col gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 dark:bg-slate-900"
          onSubmit={(evento) => {
            evento.preventDefault();
            void enviar();
          }}
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor={nomeId}
              className="text-[13px] font-semibold text-slate-700 dark:text-slate-300"
            >
              Nome do cargo
            </label>
            <input
              id={nomeId}
              value={form.nome}
              onChange={(evento) =>
                setForm((atual) =>
                  atual === null ? atual : { ...atual, nome: evento.target.value },
                )
              }
              disabled={somenteLeitura}
              required
              maxLength={80}
              placeholder="Supervisor Regional"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 dark:border-slate-700"
            />
          </div>

          {somenteLeitura && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Cargo padrão do sistema: dá para consultar, não para alterar.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {MODULOS.map(([modulo, permissions]) => (
              <fieldset
                key={modulo}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <legend className="px-1 text-[13px] font-bold capitalize text-slate-800 dark:text-slate-200">
                  {modulo}
                </legend>
                <div className="mt-1 flex flex-col gap-2">
                  {permissions.map((permission) => (
                    <LinhaDePermissao
                      key={permission}
                      permission={permission}
                      grant={porPermissao.get(permission)}
                      somenteLeitura={somenteLeitura}
                      aoAlternar={() => alternar(permission)}
                      aoRecortar={(texto) => recortar(permission, texto)}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Campo de filial vazio quer dizer <strong>todas as filiais</strong>, e não nenhuma.
            Separe vários ids por vírgula.
          </p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={somenteLeitura || salvando}
              className="h-10 rounded-xl bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              {salvando ? 'Salvando…' : form.cargo ? 'Salvar alterações' : 'Criar cargo'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setErro(null);
              }}
              className="h-10 rounded-xl border border-slate-200 px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

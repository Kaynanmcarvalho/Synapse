import { CircleAlert, CircleCheck, CloudUpload, LoaderCircle, OctagonX } from 'lucide-react';
import { ETAPAS } from '../assistente.dados';
import { quando } from '../assistente.formato';
import type { EtapaId, Pendencia } from '../assistente.tipos';
import { BOTAO_PRIMARIO } from '../campos';

export interface PropsDeFechamento {
  readonly pendencias: readonly Pendencia[];
  readonly sujo: boolean;
  readonly salvando: boolean;
  readonly atualizadoEm: string | null;
  readonly irPara: (etapa: EtapaId, aba?: string) => void;
}

const ETAPAS_CONFERIDAS = ETAPAS.filter((etapa) => etapa.abas.length > 0 || etapa.id === 'empresa');

function IconeDaEtapa({ pendencias }: { readonly pendencias: readonly Pendencia[] }) {
  if (pendencias.some((p) => p.bloqueia))
    return <OctagonX size={20} className="text-accent-danger" aria-hidden="true" />;
  if (pendencias.length > 0)
    return <CircleAlert size={20} className="text-accent-warning" aria-hidden="true" />;
  return <CircleCheck size={20} className="text-accent-teal" aria-hidden="true" />;
}

export function EtapaSincronia({
  pendencias,
  sujo,
  salvando,
  atualizadoEm,
  irPara,
  aoSincronizar,
}: PropsDeFechamento & { readonly aoSincronizar: () => void }) {
  return (
    <>
      <div className="bg-surface-soft flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center">
        <span className="bg-canvas-light text-ink flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <CloudUpload size={22} aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="text-body-md text-ink block font-semibold">
            {sujo ? 'Há alterações que ainda não estão no servidor' : 'Configuração sincronizada'}
          </span>
          <span className="text-body-sm text-mute block">
            Última gravação: {quando(atualizadoEm)}
          </span>
        </span>
        <button
          type="button"
          className={BOTAO_PRIMARIO}
          onClick={aoSincronizar}
          disabled={salvando}
        >
          {salvando && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {salvando ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
      </div>

      <ul className="mt-8 space-y-3">
        {ETAPAS_CONFERIDAS.map((etapa) => {
          const daEtapa = pendencias.filter((p) => p.etapa === etapa.id);
          return (
            <li key={etapa.id} className="border-hairline-light rounded-2xl border p-5">
              <div className="flex items-center gap-3">
                <IconeDaEtapa pendencias={daEtapa} />
                <span className="text-body-md text-ink flex-1 font-semibold">{etapa.rotulo}</span>
                <span className="text-body-sm text-stone">
                  {daEtapa.length === 0
                    ? 'Tudo certo'
                    : `${daEtapa.length} pendência${daEtapa.length > 1 ? 's' : ''}`}
                </span>
              </div>
              {daEtapa.length > 0 && (
                <ul className="mt-3 space-y-1 pl-8">
                  {daEtapa.map((pendencia) => (
                    <li key={pendencia.mensagem}>
                      <button
                        type="button"
                        onClick={() => irPara(pendencia.etapa, pendencia.aba)}
                        className={`text-body-sm text-left underline-offset-4 hover:underline ${pendencia.bloqueia ? 'text-accent-danger' : 'text-charcoal'}`}
                      >
                        {pendencia.mensagem}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-caption text-stone mt-4">
        Em vermelho, o que impede salvar. O restante pode ser salvo e completado depois, mas é
        necessário para emitir.
      </p>
    </>
  );
}

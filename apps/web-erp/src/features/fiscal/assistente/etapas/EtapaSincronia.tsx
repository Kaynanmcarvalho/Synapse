import { Button, Status, Text, type TomDeStatus } from '@synapse/sdl';
import { Secao } from '../../../../components/formulario/Formulario';
import { ETAPAS } from '../assistente.dados';
import { quando } from '../assistente.formato';
import type { EtapaId, Pendencia } from '../assistente.tipos';

export interface PropsDeFechamento {
  readonly pendencias: readonly Pendencia[];
  readonly sujo: boolean;
  readonly salvando: boolean;
  readonly atualizadoEm: string | null;
  readonly irPara: (etapa: EtapaId, aba?: string) => void;
}

const ETAPAS_CONFERIDAS = ETAPAS.filter((etapa) => etapa.abas.length > 0 || etapa.id === 'empresa');

const situacaoDaEtapa = (daEtapa: readonly Pendencia[]): { tom: TomDeStatus; texto: string } => {
  if (daEtapa.some((p) => p.bloqueia))
    return { tom: 'perigo', texto: `${daEtapa.length} pendência(s) — impede salvar` };
  if (daEtapa.length > 0) return { tom: 'atencao', texto: `${daEtapa.length} pendência(s)` };
  return { tom: 'ok', texto: 'Tudo certo' };
};

/** Revisão de tudo antes de gravar: uma linha por etapa (hairline, sem cartão)
 *  e cada pendência leva à etapa/aba onde se corrige. "Sincronizar agora" é o
 *  mesmo salvar do F8. */
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
      <Secao
        titulo={
          sujo ? 'Há alterações que ainda não estão no servidor' : 'Configuração sincronizada'
        }
        descricao={`Última gravação: ${quando(atualizadoEm)}`}
        acao={
          <Button variant="primary" onClick={aoSincronizar} loading={salvando}>
            {salvando ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>
        }
      >
        <ul className="border-line-fina divide-line-fina divide-y border-y">
          {ETAPAS_CONFERIDAS.map((etapa) => {
            const daEtapa = pendencias.filter((p) => p.etapa === etapa.id);
            const situacao = situacaoDaEtapa(daEtapa);
            return (
              <li key={etapa.id} className="py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Text variant="corpo" className="min-w-48 flex-1 font-medium">
                    {etapa.rotulo}
                  </Text>
                  <Status tone={situacao.tom}>{situacao.texto}</Status>
                </div>
                {daEtapa.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 pl-4">
                    {daEtapa.map((pendencia) => (
                      <li key={`${pendencia.aba ?? ''}${pendencia.mensagem}`}>
                        <button
                          type="button"
                          onClick={() => irPara(pendencia.etapa, pendencia.aba)}
                          className="text-body-sm rounded-minimo focus-visible:ring-primary/40 text-left underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                        >
                          <Text
                            variant="corpo"
                            as="span"
                            tone={pendencia.bloqueia ? 'perigo' : 'apoio'}
                          >
                            {pendencia.mensagem}
                          </Text>
                          <Text variant="legenda" className="ml-1">
                            {pendencia.bloqueia ? '· impede salvar' : '· necessário para emitir'}
                          </Text>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Secao>
    </>
  );
}

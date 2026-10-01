import { Status, Text } from '@synapse/sdl';
import type { Pendencia } from './assistente.tipos';
import { resumoDePendencias } from './pendencias.resumo';

/** Pendências da etapa aberta, no alto da área de trabalho — é o que a pessoa
 *  vê quando o F8 a traz até aqui. Depois de um F8 bloqueado, o que tem campo
 *  na aba aberta passa a aparecer NO campo e sai daqui (um lugar só por
 *  mensagem). Clicar leva à aba e ao campo, sem foco automático. */
export function PendenciasDaEtapa({
  pendencias,
  abaAtual,
  revelar,
  aoIr,
}: {
  readonly pendencias: readonly Pendencia[];
  readonly abaAtual: string;
  readonly revelar: boolean;
  readonly aoIr: (pendencia: Pendencia) => void;
}) {
  const visiveis = pendencias.filter(
    (p) => !(revelar && p.bloqueia && p.campo && (!p.aba || p.aba === abaAtual)),
  );
  if (pendencias.length === 0) return null;
  const bloqueios = pendencias.filter((p) => p.bloqueia).length;
  // Recolhida por padrão (uma linha, não empurra o formulário); abre sozinha
  // depois de um F8 bloqueado, que é quando a pessoa foi trazida até aqui.
  return (
    <details
      key={revelar ? 'aberta' : 'recolhida'}
      open={revelar && visiveis.length > 0}
      aria-label="Pendências desta etapa"
      className={`mb-5 border-l-2 pl-3 ${bloqueios > 0 ? 'border-status-perigo' : 'border-status-atencao'}`}
    >
      <summary className="rounded-minimo focus-visible:ring-primary/40 cursor-pointer py-0.5 outline-none focus-visible:ring-2">
        <Text variant="rotulo" as="span">
          {resumoDePendencias(pendencias).texto}
          {visiveis.length < pendencias.length && ' — as do formulário estão marcadas nos campos'}
        </Text>
      </summary>
      {visiveis.length > 0 && (
        <ul className="flex flex-wrap gap-x-6 gap-y-1 pb-1 pt-1.5">
          {visiveis.map((pendencia) => (
            <li key={`${pendencia.aba ?? ''}${pendencia.mensagem}`}>
              <button
                type="button"
                onClick={() => aoIr(pendencia)}
                className="rounded-minimo focus-visible:ring-primary/40 text-left outline-none hover:underline focus-visible:ring-2"
              >
                <Status tone={pendencia.bloqueia ? 'perigo' : 'atencao'}>
                  {pendencia.mensagem}
                  <Text variant="legenda" className="ml-1">
                    {pendencia.bloqueia ? '· impede salvar' : '· necessário para emitir'}
                  </Text>
                </Status>
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

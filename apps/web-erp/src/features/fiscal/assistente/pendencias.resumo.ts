import type { Pendencia } from './assistente.tipos';

/** Contagem de pendências de uma etapa, em texto (lida também em escala de
 *  cinza e por leitor de tela). */
export const resumoDePendencias = (daEtapa: readonly Pendencia[]) => {
  const bloqueios = daEtapa.filter((p) => p.bloqueia).length;
  return {
    bloqueios,
    texto:
      daEtapa.length === 0
        ? null
        : bloqueios > 0
          ? `${daEtapa.length} pendência${daEtapa.length > 1 ? 's' : ''}, ${bloqueios} impede${bloqueios > 1 ? 'm' : ''} salvar`
          : `${daEtapa.length} pendência${daEtapa.length > 1 ? 's' : ''}`,
  };
};

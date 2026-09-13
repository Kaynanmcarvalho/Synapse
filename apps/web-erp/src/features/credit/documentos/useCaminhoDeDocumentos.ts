import { useCallback, useState } from 'react';
import { abrirPelaLupa, irPara, seguirVinculo, voltar, type Documento } from './navegacao';

/** O caminho da janela de documentos: a lupa comeca um caminho, os vinculos o
 *  estendem, e voltar ou clicar no breadcrumb recuam. */
export const useCaminhoDeDocumentos = () => {
  const [caminho, setCaminho] = useState<readonly Documento[]>([]);
  return {
    caminho,
    abrir: useCallback((documento: Documento) => setCaminho(abrirPelaLupa(documento)), []),
    seguir: useCallback(
      (documento: Documento) => setCaminho((atual) => seguirVinculo(atual, documento)),
      [],
    ),
    voltar: useCallback(() => setCaminho((atual) => voltar(atual)), []),
    irPara: useCallback((indice: number) => setCaminho((atual) => irPara(atual, indice)), []),
  };
};

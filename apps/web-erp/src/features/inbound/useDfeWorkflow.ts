import { useConferenciaDoDocumento } from './useConferenciaDoDocumento';
import { useNotasRecebidas } from './useNotasRecebidas';

/** Estado e ações da tela de DF-e — composição de `useNotasRecebidas`
 *  (a lista) e `useConferenciaDoDocumento` (o documento selecionado),
 *  isolada de `DfeScreen` só para manter a função de composição sob o
 *  limite de linhas do lint; nenhum comportamento muda. */
export function useDfeWorkflow() {
  const notas = useNotasRecebidas();
  const conferencia = useConferenciaDoDocumento(notas.selected, notas.refresh);

  return {
    entries: notas.entries,
    selectedKey: notas.selectedKey,
    setSelectedKey: notas.setSelectedKey,
    selected: notas.selected,
    carregando: notas.carregando,
    erroDaLista: notas.erroDaLista,
    ...conferencia,
  };
}

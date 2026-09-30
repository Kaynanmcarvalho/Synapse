import { useEffect, useState } from 'react';
import { lerMoeda } from '../customers/formato';
import { lerQuantidade } from '../vendas/comum/itens';
import {
  checkDfeItem,
  concludeDfe,
  importDfe,
  launchDfe,
  type DfeEntry,
  type DfeItem,
} from './dfe.api';
import type { RascunhoDoItem } from './dfe.grammar';
import { rascunhoDoOriginal } from './dfe.util';

type Aviso = { readonly tom: 'sucesso' | 'erro'; readonly texto: string } | null;

/** Só a coleta dos 4 dados do lançamento — separado do hook para manter
 *  `useConferenciaDoDocumento` sob o limite de linhas do lint. `null`
 *  quando a pessoa cancelou ou deixou algum campo vazio. */
const coletarDadosDeLancamento = (
  cnpjDoEmitente: string,
): { branchId: string; warehouseId: string; supplierId: string; defaultDueDate: string } | null => {
  const branchId = window.prompt('ID da filial');
  const warehouseId = window.prompt('ID do depósito');
  const supplierId = window.prompt('ID do fornecedor', cnpjDoEmitente);
  const defaultDueDate = window.prompt(
    'Vencimento quando o XML não tiver duplicatas (AAAA-MM-DD)',
    new Date().toISOString().slice(0, 10),
  );
  if (!branchId || !warehouseId || !supplierId || !defaultDueDate) return null;
  return { branchId, warehouseId, supplierId, defaultDueDate };
};

/** O rascunho de edição (textos) para o payload que a API espera (inteiros
 *  em milésimos/centavos) — mesma separação de responsabilidade. */
const payloadDoItem = (rascunho: RascunhoDoItem) => ({
  productId: rascunho.productId.trim(),
  quantidadeMilesimos: lerQuantidade(rascunho.quantidadeTexto) ?? 0,
  custoUnitarioCentavos: lerMoeda(rascunho.custoTexto),
  lote: rascunho.lote.trim() || null,
  validade: rascunho.validade || null,
});

const semErroDoItem = (erros: Record<number, string>, numero: number): Record<number, string> => {
  const copia = { ...erros };
  delete copia[numero];
  return copia;
};

/** Edição dos itens e ações do documento selecionado (importar, conferir
 *  item, concluir, lançar) — isolado só para manter `useDfeWorkflow` sob o
 *  limite de linhas do lint; nenhum comportamento muda. */
export function useConferenciaDoDocumento(selected: DfeEntry | null, refresh: () => Promise<void>) {
  const [drafts, setDrafts] = useState<Record<number, RascunhoDoItem>>({});
  const [erroDoItem, setErroDoItem] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  useEffect(() => {
    if (selected) {
      setDrafts(
        Object.fromEntries(
          selected.conferencia.itens.map((item) => [item.numero, rascunhoDoOriginal(item)]),
        ),
      );
      setErroDoItem({});
    }
  }, [selected]);

  const run = async (operation: () => Promise<unknown>, sucesso: string) => {
    setBusy(true);
    setAviso(null);
    try {
      await operation();
      await refresh();
      setAviso({ tom: 'sucesso', texto: sucesso });
    } catch (cause) {
      setAviso({
        tom: 'erro',
        texto: cause instanceof Error ? cause.message : 'Operação não concluída',
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmItem = async (item: DfeItem, rascunho: RascunhoDoItem) => {
    setBusy(true);
    setErroDoItem((atual) => semErroDoItem(atual, item.numero));
    try {
      await checkDfeItem(selected!.nota.chaveDeAcesso, item.numero, payloadDoItem(rascunho));
      await refresh();
    } catch (cause) {
      setErroDoItem((atual) => ({
        ...atual,
        [item.numero]: cause instanceof Error ? cause.message : 'Não foi possível conferir o item',
      }));
    } finally {
      setBusy(false);
    }
  };

  const launchSelected = () => {
    if (!selected) return;
    const dados = coletarDadosDeLancamento(selected.nota.emitente.cnpj);
    if (!dados) {
      setAviso({
        tom: 'erro',
        texto: 'Informe filial, depósito, fornecedor e vencimento para lançar a entrada.',
      });
      return;
    }
    void run(
      () => launchDfe(selected.nota.chaveDeAcesso, dados),
      'Entrada lançada no estoque e financeiro',
    );
  };

  const importarXml = (xml: string) =>
    void run(async () => importDfe(xml), 'XML importado para conferência');

  const concluir = () =>
    selected && void run(() => concludeDfe(selected.nota.chaveDeAcesso), 'Conferência concluída');

  const onChangeDraft = (numero: number, patch: Partial<RascunhoDoItem>) =>
    setDrafts((atual) => ({ ...atual, [numero]: { ...atual[numero]!, ...patch } }));

  return {
    drafts,
    erroDoItem,
    busy,
    aviso,
    onChangeDraft,
    confirmItem,
    launchSelected,
    importarXml,
    concluir,
  };
}

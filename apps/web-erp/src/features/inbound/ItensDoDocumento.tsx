import {
  Button,
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Input,
  MoneyInput,
  Text,
} from '@synapse/sdl';
import { Fragment } from 'react';
import { lerQuantidade } from '../vendas/comum/itens';
import type { DfeEntry, DfeItem } from './dfe.api';
import { type RascunhoDoItem } from './dfe.grammar';
import { rascunhoDoOriginal } from './dfe.util';

export function ItensDoDocumento({
  selected,
  drafts,
  erroDoItem,
  disabled,
  onChangeDraft,
  onConfirmItem,
}: {
  readonly selected: DfeEntry;
  readonly drafts: Record<number, RascunhoDoItem>;
  readonly erroDoItem: Record<number, string>;
  readonly disabled: boolean;
  readonly onChangeDraft: (numero: number, patch: Partial<RascunhoDoItem>) => void;
  readonly onConfirmItem: (item: DfeItem, rascunho: RascunhoDoItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-hairline-light border-b">
            <DataGridCabecalho id="item" rotulo="Item" />
            <DataGridCabecalho id="produto" rotulo="Produto interno" />
            <DataGridCabecalho id="quantidade" rotulo="Quantidade" alinhamento="direita" />
            <DataGridCabecalho id="custo" rotulo="Custo unitário" alinhamento="direita" />
            <DataGridCabecalho id="lote" rotulo="Lote" />
            <DataGridCabecalho id="validade" rotulo="Validade" />
            <DataGridCabecalho id="acao" rotulo="" />
          </tr>
        </thead>
        <tbody>
          {selected.conferencia.itens.map((original) => (
            <LinhaDoItem
              key={original.numero}
              original={original}
              rascunho={drafts[original.numero] ?? rascunhoDoOriginal(original)}
              erro={erroDoItem[original.numero]}
              disabled={disabled}
              onChangeDraft={onChangeDraft}
              onConfirmItem={onConfirmItem}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Os 5 campos editáveis de um item — isolado de `LinhaDoItem` só para
 *  manter cada função sob o limite de linhas/complexidade do lint; nenhum
 *  comportamento muda. */
function CamposEditaveis({
  original,
  rascunho,
  disabled,
  onChangeDraft,
}: {
  readonly original: DfeItem;
  readonly rascunho: RascunhoDoItem;
  readonly disabled: boolean;
  readonly onChangeDraft: (numero: number, patch: Partial<RascunhoDoItem>) => void;
}) {
  return (
    <>
      <DataGridCelula truncar={false}>
        <Input
          aria-label={`Produto interno do item ${original.numero}`}
          value={rascunho.productId}
          disabled={disabled}
          onChange={(event) => onChangeDraft(original.numero, { productId: event.target.value })}
          className="w-full"
        />
        {original.observacao && !original.conferido && (
          <Text variant="legenda" tone="atencao" className="mt-1 block">
            {original.observacao}
          </Text>
        )}
      </DataGridCelula>
      <DataGridCelula alinhamento="direita" truncar={false}>
        <Input
          aria-label={`Quantidade do item ${original.numero}`}
          inputMode="decimal"
          align="right"
          disabled={disabled}
          value={rascunho.quantidadeTexto}
          onChange={(event) =>
            onChangeDraft(original.numero, { quantidadeTexto: event.target.value })
          }
          className="font-data w-28"
        />
      </DataGridCelula>
      <DataGridCelula alinhamento="direita" truncar={false}>
        <MoneyInput
          aria-label={`Custo unitário do item ${original.numero}, em reais`}
          disabled={disabled}
          value={rascunho.custoTexto}
          onChange={(event) => onChangeDraft(original.numero, { custoTexto: event.target.value })}
          className="w-32"
        />
      </DataGridCelula>
      <DataGridCelula truncar={false}>
        <Input
          aria-label={`Lote do item ${original.numero}`}
          disabled={disabled}
          value={rascunho.lote}
          onChange={(event) => onChangeDraft(original.numero, { lote: event.target.value })}
          className="w-32"
        />
      </DataGridCelula>
      <DataGridCelula truncar={false}>
        <Input
          aria-label={`Validade do item ${original.numero}`}
          type="date"
          disabled={disabled}
          value={rascunho.validade}
          onChange={(event) => onChangeDraft(original.numero, { validade: event.target.value })}
          className="font-data w-36"
        />
      </DataGridCelula>
    </>
  );
}

function LinhaDoItem({
  original,
  rascunho,
  erro,
  disabled,
  onChangeDraft,
  onConfirmItem,
}: {
  readonly original: DfeItem;
  readonly rascunho: RascunhoDoItem;
  readonly erro: string | undefined;
  readonly disabled: boolean;
  readonly onChangeDraft: (numero: number, patch: Partial<RascunhoDoItem>) => void;
  readonly onConfirmItem: (item: DfeItem, rascunho: RascunhoDoItem) => void;
}) {
  const quantidadeValida = lerQuantidade(rascunho.quantidadeTexto) !== null;
  const podeConferir = !disabled && rascunho.productId.trim().length > 0 && quantidadeValida;
  return (
    <Fragment>
      <tr className={classesDaLinha({ clicavel: false, focoComAnel: false })}>
        <DataGridCelula papel="data" truncar={false}>
          <Text variant="dado">#{original.numero}</Text>
        </DataGridCelula>
        <CamposEditaveis
          original={original}
          rascunho={rascunho}
          disabled={disabled}
          onChangeDraft={onChangeDraft}
        />
        <DataGridCelula papel="action" alinhamento="direita" truncar={false}>
          <Button
            variant={original.conferido ? 'secondary' : 'primary'}
            density="compacta"
            disabled={!podeConferir}
            onClick={() => onConfirmItem(original, rascunho)}
          >
            {original.conferido ? 'Revisar' : 'Conferir'}
          </Button>
        </DataGridCelula>
      </tr>
      {erro && (
        <tr>
          <td colSpan={7} className="px-3 pb-3">
            <Text variant="legenda" tone="perigo" role="alert" className="block">
              Item {original.numero}: {erro}
            </Text>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

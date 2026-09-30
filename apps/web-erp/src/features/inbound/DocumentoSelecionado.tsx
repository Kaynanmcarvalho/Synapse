import { Button, Divider, Status, Surface, Text } from '@synapse/sdl';
import { PackageCheck } from 'lucide-react';
import type { DfeEntry, DfeItem } from './dfe.api';
import { SITUACAO_LABEL, TOM_DA_SITUACAO, type RascunhoDoItem } from './dfe.grammar';
import { ItensDoDocumento } from './ItensDoDocumento';

export function DocumentoSelecionado({
  selected,
  drafts,
  erroDoItem,
  busy,
  onChangeDraft,
  onConfirmItem,
  onConclude,
  onLaunch,
}: {
  readonly selected: DfeEntry;
  readonly drafts: Record<number, RascunhoDoItem>;
  readonly erroDoItem: Record<number, string>;
  readonly busy: boolean;
  readonly onChangeDraft: (numero: number, patch: Partial<RascunhoDoItem>) => void;
  readonly onConfirmItem: (item: DfeItem, rascunho: RascunhoDoItem) => void;
  readonly onConclude: () => void;
  readonly onLaunch: () => void;
}) {
  const { situacao } = selected.conferencia;
  const grade = situacao === 'PENDENTE';
  return (
    <Surface variant="painel" as="article" aria-label={`NF-e ${selected.nota.numero}`}>
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <Text variant="tituloSecao" as="h2">
            {selected.nota.emitente.nome}
          </Text>
          <Text variant="legenda" className="mt-0.5 block">
            CNPJ {selected.nota.emitente.cnpj} · NF-e {selected.nota.numero}
          </Text>
          <Text variant="legenda" tone="sutil" className="font-data mt-0.5 block break-all">
            {selected.nota.chaveDeAcesso}
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <Status tone={TOM_DA_SITUACAO[situacao]}>{SITUACAO_LABEL[situacao]}</Status>
          {situacao === 'PENDENTE' && (
            <Button variant="secondary" disabled={busy} onClick={onConclude}>
              Concluir conferência
            </Button>
          )}
          {situacao === 'CONFERIDA' && (
            <Button variant="primary" disabled={busy} onClick={onLaunch}>
              <PackageCheck size={15} aria-hidden="true" /> Lançar entrada
            </Button>
          )}
        </div>
      </header>
      <Divider />

      <div className="p-5">
        <ItensDoDocumento
          selected={selected}
          drafts={drafts}
          erroDoItem={erroDoItem}
          disabled={busy || !grade}
          onChangeDraft={onChangeDraft}
          onConfirmItem={onConfirmItem}
        />

        {situacao === 'CONFERIDA' && (
          <Text variant="corpo" tone="apoio" role="status" className="mt-4 block">
            Conferência concluída — pronta para lançar a entrada.
          </Text>
        )}
        {situacao === 'LANCADA' && (
          <Text variant="corpo" tone="apoio" role="status" className="mt-4 block">
            Lançado no estoque e no financeiro — conferência encerrada.
          </Text>
        )}
      </div>
    </Surface>
  );
}

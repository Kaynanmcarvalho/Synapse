import { Surface, Text } from '@synapse/sdl';
import { CabecalhoDoDfe } from './CabecalhoDoDfe';
import { DocumentoSelecionado } from './DocumentoSelecionado';
import { ListaDeNotas } from './ListaDeNotas';
import { useDfeWorkflow } from './useDfeWorkflow';

export function DfeScreen() {
  const workflow = useDfeWorkflow();

  return (
    <Surface
      variant="pagina"
      as="main"
      className="max-w-conteudo-ampla mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <CabecalhoDoDfe
        busy={workflow.busy}
        aviso={workflow.aviso}
        onImportarXml={workflow.importarXml}
      />

      <div className="mt-5 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0" aria-label="Notas recebidas">
          <div className="mb-2 flex items-baseline justify-between">
            <Text variant="tituloCartao" as="h2">
              Notas recebidas
            </Text>
            <Text variant="legenda">{workflow.entries.length}</Text>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <ListaDeNotas
              entries={workflow.entries}
              carregando={workflow.carregando}
              erro={workflow.erroDaLista}
              selectedKey={workflow.selectedKey}
              onSelect={workflow.setSelectedKey}
            />
          </div>
        </aside>

        <div className="min-w-0">
          {workflow.selected ? (
            <DocumentoSelecionado
              selected={workflow.selected}
              drafts={workflow.drafts}
              erroDoItem={workflow.erroDoItem}
              busy={workflow.busy}
              onChangeDraft={workflow.onChangeDraft}
              onConfirmItem={workflow.confirmItem}
              onConclude={workflow.concluir}
              onLaunch={workflow.launchSelected}
            />
          ) : (
            <Surface
              variant="afundada"
              className="flex min-h-[300px] items-center justify-center p-6 text-center"
            >
              <Text variant="corpoSecundario">Selecione uma nota para conferir os itens.</Text>
            </Surface>
          )}
        </div>
      </div>
    </Surface>
  );
}

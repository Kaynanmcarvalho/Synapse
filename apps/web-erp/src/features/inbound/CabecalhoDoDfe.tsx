import { Button, Divider, Text } from '@synapse/sdl';
import { Upload } from 'lucide-react';
import { useRef } from 'react';

type Aviso = { readonly tom: 'sucesso' | 'erro'; readonly texto: string } | null;

/** Título + botão de importar XML + aviso — isolado de `DfeScreen` só para
 *  manter a função de composição sob o limite de linhas do lint. */
export function CabecalhoDoDfe({
  busy,
  aviso,
  onImportarXml,
}: {
  readonly busy: boolean;
  readonly aviso: Aviso;
  readonly onImportarXml: (xml: string) => void;
}) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
        <div className="min-w-0">
          <Text variant="tituloTela">Entrada por XML</Text>
          <Text variant="corpoSecundario" className="mt-1 max-w-2xl">
            Confira cada item antes de movimentar estoque, custos e financeiro.
          </Text>
        </div>
        <input
          ref={arquivoRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void file.text().then(onImportarXml);
            event.target.value = '';
          }}
        />
        <Button variant="primary" disabled={busy} onClick={() => arquivoRef.current?.click()}>
          <Upload size={14} aria-hidden="true" /> Importar XML
        </Button>
      </div>
      <Divider />

      {aviso && (
        <Text
          variant="corpo"
          tone={aviso.tom === 'erro' ? 'perigo' : 'ok'}
          role={aviso.tom === 'erro' ? 'alert' : 'status'}
          className="mt-4 block"
        >
          {aviso.texto}
        </Text>
      )}
    </>
  );
}

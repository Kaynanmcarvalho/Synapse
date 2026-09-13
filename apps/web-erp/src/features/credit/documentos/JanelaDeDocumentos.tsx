import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Janela } from '../janela/Janela';
import { aoAbrir, type Area } from '../janela/geometria';
import type { Pilha } from '../pilha';
import { Carregando, Falha } from '../ui/Superficies';
import { DetalheDaNota } from './DetalheDaNota';
import { DetalheDoPedido } from './DetalheDoPedido';
import { DetalheDoTituloEmAberto } from './DetalheDoTituloEmAberto';
import { DetalheDoTituloPago } from './DetalheDoTituloPago';
import type { Documento } from './navegacao';
import { useDocumento, type DadosDoDocumento } from './useDocumento';

const ABERTURA = (area: Area) => aoAbrir(area, 0.62, 0.86, 'centro');

function Trilha({
  caminho,
  aoVoltar,
  aoIrPara,
}: {
  readonly caminho: readonly Documento[];
  readonly aoVoltar: () => void;
  readonly aoIrPara: (indice: number) => void;
}) {
  return (
    <nav
      aria-label="Caminho entre documentos"
      className="border-hairline-light bg-canvas-light flex shrink-0 items-center gap-2 border-b px-4 py-2"
    >
      <button
        type="button"
        onClick={aoVoltar}
        disabled={caminho.length < 2}
        className="text-button-sm text-ink hover:bg-surface-soft inline-flex h-8 items-center gap-1 rounded-full px-2.5 transition disabled:opacity-30"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Voltar
      </button>
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {caminho.map((documento, indice) => {
          const atual = indice === caminho.length - 1;
          return (
            <li
              key={`${documento.tipo}-${documento.id}`}
              className="flex shrink-0 items-center gap-1"
            >
              {indice > 0 && <ChevronRight size={14} className="text-faint" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => aoIrPara(indice)}
                aria-current={atual ? 'page' : undefined}
                disabled={atual}
                className={`text-body-sm rounded-full px-2 py-0.5 transition ${
                  atual ? 'text-ink font-semibold' : 'text-accent-link hover:underline'
                }`}
              >
                {documento.rotulo}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Detalhe({
  documento,
  dados,
  aoSeguir,
}: {
  readonly documento: Documento;
  readonly dados: DadosDoDocumento;
  readonly aoSeguir: (documento: Documento) => void;
}) {
  if (dados.tipo === 'pedido') return <DetalheDoPedido detalhe={dados.dados} aoSeguir={aoSeguir} />;
  if (dados.tipo === 'nota') return <DetalheDaNota detalhe={dados.dados} aoSeguir={aoSeguir} />;
  const visao =
    (documento.tipo === 'titulo' && documento.visao) ||
    (dados.dados.situacao === 'QUITADO' ? 'pago' : 'aberto');
  return visao === 'pago' ? (
    <DetalheDoTituloPago titulo={dados.dados} aoSeguir={aoSeguir} />
  ) : (
    <DetalheDoTituloEmAberto titulo={dados.dados} aoSeguir={aoSeguir} />
  );
}

/** Uma janela para os documentos que a lupa abre. Cada tipo tem o seu detalhe;
 *  a janela so cuida do caminho, do voltar e do estado de carga. */
export function JanelaDeDocumentos({
  caminho,
  aoSeguir,
  aoVoltar,
  aoIrPara,
  ...pilha
}: Pilha & {
  readonly caminho: readonly Documento[];
  readonly aoSeguir: (documento: Documento) => void;
  readonly aoVoltar: () => void;
  readonly aoIrPara: (indice: number) => void;
}) {
  const atual = caminho.at(-1) ?? null;
  const estado = useDocumento(atual);
  return (
    <Janela
      id="analise-de-credito.documentos"
      titulo={atual?.rotulo ?? 'Documento'}
      subtitulo="Pedido, nota fiscal e títulos do cliente"
      abertura={ABERTURA}
      {...pilha}
    >
      <div className="flex h-full min-h-0 flex-col">
        <Trilha caminho={caminho} aoVoltar={aoVoltar} aoIrPara={aoIrPara} />
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] p-4">
          {estado.status === 'carregando' && <Carregando texto="Abrindo o documento…" />}
          {estado.status === 'erro' && (
            <Falha
              titulo={
                estado.naoEncontrado
                  ? 'Documento não encontrado'
                  : 'Não foi possível abrir o documento'
              }
              texto={
                estado.naoEncontrado
                  ? `${estado.mensagem}. Ele pode ter sido removido ou ainda não existir.`
                  : estado.mensagem
              }
            />
          )}
          {estado.status === 'pronto' && atual && (
            <Detalhe documento={atual} dados={estado.documento} aoSeguir={aoSeguir} />
          )}
        </div>
      </div>
    </Janela>
  );
}

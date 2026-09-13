import type { TituloDoDocumento } from '@synapse/types';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from '../Tabela';
import { formatarData, formatarMoeda } from '../analise';
import { ROTULO_DA_SITUACAO_DO_TITULO } from '../rotulos';
import { Situacao } from '../ui/Etiquetas';
import { documentoDoTitulo, type Documento } from './navegacao';

/** Pecas comuns aos detalhes de documento: o vinculo que leva a outro
 *  documento, a lista de titulos de um documento e a linha do tempo. */

export function Vinculo({
  documento,
  aoSeguir,
  children,
}: {
  readonly documento: Documento;
  readonly aoSeguir: (documento: Documento) => void;
  readonly children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => aoSeguir(documento)}
      className="text-accent-link decoration-accent-link/30 hover:decoration-accent-link inline-flex items-center gap-1 font-semibold underline underline-offset-4 transition"
    >
      {children ?? documento.rotulo}
      <ArrowUpRight size={14} aria-hidden="true" />
    </button>
  );
}

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Título' },
  { rotulo: 'Parcela', alinhamento: 'centro', largura: '76px' },
  { rotulo: 'Vencimento', alinhamento: 'centro' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: 'Saldo', alinhamento: 'direita' },
  { rotulo: 'Situação' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

const tomDaSituacao = (titulo: TituloDoDocumento) => {
  if (titulo.situacao === 'VENCIDO') return 'critico' as const;
  if (titulo.situacao === 'QUITADO') return 'positivo' as const;
  return 'neutro' as const;
};

export function TitulosDoDocumento({
  titulos,
  aoSeguir,
  vazio,
}: {
  readonly titulos: readonly TituloDoDocumento[];
  readonly aoSeguir: (documento: Documento) => void;
  readonly vazio: string;
}) {
  if (titulos.length === 0) return <p className="text-body-sm text-stone py-2">{vazio}</p>;
  return (
    <Tabela colunas={COLUNAS} larguraMinima={560}>
      {titulos.map((titulo) => (
        <LinhaDaTabela key={titulo.id} destaque={titulo.situacao === 'VENCIDO'}>
          <Celula coluna={coluna(0)} forte>
            <Vinculo
              documento={documentoDoTitulo(
                titulo,
                titulo.situacao === 'QUITADO' ? 'pago' : 'aberto',
              )}
              aoSeguir={aoSeguir}
            >
              {titulo.numero}
            </Vinculo>
          </Celula>
          <Celula coluna={coluna(1)}>{titulo.parcela}</Celula>
          <Celula coluna={coluna(2)}>{formatarData(titulo.vencimento)}</Celula>
          <Celula coluna={coluna(3)}>{formatarMoeda(titulo.valorOriginalCentavos)}</Celula>
          <Celula coluna={coluna(4)} forte>
            {formatarMoeda(titulo.saldoCentavos)}
          </Celula>
          <Celula coluna={coluna(5)}>
            <Situacao
              texto={ROTULO_DA_SITUACAO_DO_TITULO[titulo.situacao]}
              tom={tomDaSituacao(titulo)}
            />
          </Celula>
        </LinhaDaTabela>
      ))}
    </Tabela>
  );
}

export interface ItemDaLinhaDoTempo {
  readonly chave: string;
  readonly em: string | null;
  readonly titulo: string;
  readonly detalhe?: string | null;
  readonly autor?: string | null;
  readonly feito?: boolean;
  readonly extra?: ReactNode;
}

export function LinhaDoTempo({
  itens,
  formatar,
}: {
  readonly itens: readonly ItemDaLinhaDoTempo[];
  readonly formatar: (iso: string) => string;
}) {
  return (
    <ol className="border-hairline-light relative ml-2 border-l pl-5">
      {itens.map((item) => (
        <li key={item.chave} className="relative pb-4 last:pb-0">
          <span
            aria-hidden="true"
            className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 ${
              item.feito === false
                ? 'border-hairline-light bg-canvas-light'
                : 'border-canvas-dark bg-canvas-dark'
            }`}
          />
          <p className="text-body-sm text-ink flex flex-wrap items-baseline gap-x-2 font-semibold">
            {item.titulo}
            <span className="text-caption text-stone font-normal tabular-nums">
              {item.em
                ? formatar(item.em)
                : item.feito === false
                  ? 'Aguardando'
                  : 'Sem data registrada'}
              {item.autor ? ` · ${item.autor}` : ''}
            </span>
          </p>
          {item.detalhe && <p className="text-caption text-mute mt-0.5">{item.detalhe}</p>}
          {item.extra}
        </li>
      ))}
    </ol>
  );
}

/** Copia um valor longo (chave de acesso, linha digitavel) e confirma na hora. */
export function Copiar({ valor, rotulo }: { readonly valor: string; readonly rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    void navigator.clipboard
      ?.writeText(valor)
      .then(() => {
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 1600);
      })
      .catch(() => undefined);
  };
  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={rotulo}
      className="text-charcoal hover:bg-surface-soft inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] font-semibold transition"
    >
      {copiado ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      {copiado ? 'Copiado' : 'Copiar'}
    </button>
  );
}

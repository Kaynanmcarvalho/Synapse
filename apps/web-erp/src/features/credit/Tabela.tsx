import {
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  IconButton,
  TAMANHO_DE_ICONE,
} from '@synapse/sdl';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ColunaDaTabela {
  readonly rotulo: string;
  readonly alinhamento?: 'esquerda' | 'direita' | 'centro';
  /** Largura fixa, quando a coluna nao deve crescer (lupa, serie, dias). */
  readonly largura?: string;
}

/** Tabela das partes da ficha de credito — primitive de dominio, com 8
 *  consumidores (titulos, pagamentos, historico, itens, parcelas, documentos,
 *  pedidos em analise). Fase 5.4: a API ficou igual, mas cabecalho, celula,
 *  linha e lupa agora vem da fundacao de DataGrid (sentence case, `font-data`,
 *  hover da Data Row v1, IconButton do SDL).
 *
 *  O que continua sendo decisao local, de proposito: o divisor VERTICAL entre
 *  colunas. A ficha cruza muitas colunas numericas estreitas lado a lado
 *  (serie, parcela, dias, valor, saldo) e o olho segue a coluna por ele; a Data
 *  Row v1 so tem hairline horizontal porque nasceu de listas (Clientes, Fila). */
export function Tabela({
  colunas,
  larguraMinima,
  children,
}: {
  readonly colunas: readonly ColunaDaTabela[];
  readonly larguraMinima: number;
  readonly children: ReactNode;
}) {
  return (
    <div className="border-hairline-light overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse" style={{ minWidth: larguraMinima }}>
        <thead className="bg-surface-soft sticky top-0 z-[1]">
          <tr className="divide-hairline-light border-hairline-light divide-x border-b">
            {colunas.map((coluna, indice) => (
              <DataGridCabecalho
                key={coluna.rotulo || `coluna-${indice}`}
                id={coluna.rotulo || `coluna-${indice}`}
                rotulo={coluna.rotulo}
                alinhamento={coluna.alinhamento ?? 'esquerda'}
                style={coluna.largura ? { width: coluna.largura } : undefined}
                className="py-2"
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-hairline-light text-body-sm divide-y">{children}</tbody>
      </table>
    </div>
  );
}

/** Linha da tabela da ficha: separacao vertical igual a do titulo. `destaque`
 *  (titulo vencido) continua sendo um fundo de perigo quase imperceptivel — e
 *  a unica linha que chama o olho sem precisar de selo. */
export function LinhaDaTabela({
  children,
  destaque = false,
}: {
  readonly children: ReactNode;
  readonly destaque?: boolean;
}) {
  return (
    <tr
      className={`${classesDaLinha({
        clicavel: false,
        focoComAnel: false,
        hairlineNaLinha: false,
        selecionada: false,
      })} divide-hairline-light divide-x ${destaque ? 'bg-accent-danger/[0.04]' : ''}`}
    >
      {children}
    </tr>
  );
}

/** Tudo na ficha e numero/codigo/data cruzado com vizinhos, por isso `data`
 *  (algarismo de largura fixa) — o mesmo `tabular-nums` que ja existia, agora
 *  pela regra da fundacao. */
export function Celula({
  children,
  coluna,
  forte = false,
}: {
  readonly children: ReactNode;
  readonly coluna: ColunaDaTabela;
  readonly forte?: boolean;
}) {
  return (
    <DataGridCelula
      papel="data"
      densidade="compacta"
      alinhamento={coluna.alinhamento ?? 'esquerda'}
      truncar={false}
      className={`whitespace-nowrap ${forte ? 'text-ink font-semibold' : 'text-charcoal'}`}
    >
      {children}
    </DataGridCelula>
  );
}

/** A lupa que abre o documento por tras de uma linha. Sem documento ligado,
 *  ela fica desabilitada — e o titulo avisa por que. */
export function BotaoLupa({
  rotulo,
  aoAbrir,
}: {
  readonly rotulo: string;
  readonly aoAbrir: (() => void) | null;
}) {
  return (
    <IconButton
      label={rotulo}
      density="compacta"
      onClick={aoAbrir ?? undefined}
      disabled={!aoAbrir}
      title={aoAbrir ? rotulo : 'Este registro não está ligado a um pedido'}
    >
      <Search size={TAMANHO_DE_ICONE.compacta} aria-hidden="true" />
    </IconButton>
  );
}

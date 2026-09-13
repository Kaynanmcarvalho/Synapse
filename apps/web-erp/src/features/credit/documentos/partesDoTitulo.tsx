import type { DetalheDoTitulo } from '@synapse/types';
import { Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from '../Tabela';
import { formatarData, formatarDataHora, formatarMoeda, pagamentoPorExtenso } from '../analise';
import { ROTULO_DA_FORMA } from '../rotulos';
import { documentoDaNota, documentoDoPedido, type Documento } from './navegacao';
import { LinhaDoTempo, Vinculo } from './partes';

/** Pecas dos dois detalhes de titulo (a receber e pago): os vinculos com pedido
 *  e nota, a lista de liquidacoes e a linha do tempo. */

export function VinculosDoTitulo({
  titulo,
  aoSeguir,
}: {
  readonly titulo: DetalheDoTitulo;
  readonly aoSeguir: (documento: Documento) => void;
}) {
  const { pedidoId, pedidoNumero, nota } = titulo;
  if (!pedidoId) return <span className="text-stone italic">Título sem pedido de origem</span>;
  if (pedidoNumero === null)
    return (
      <span className="text-stone italic">
        Pedido de origem não encontrado (pode ter sido removido)
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Vinculo
        documento={documentoDoPedido({ id: pedidoId, numero: pedidoNumero })}
        aoSeguir={aoSeguir}
      />
      {nota ? (
        <Vinculo
          documento={documentoDaNota({ pedidoId, numero: nota.numero })}
          aoSeguir={aoSeguir}
        />
      ) : (
        <span className="text-stone text-body-sm italic">Sem nota fiscal</span>
      )}
    </span>
  );
}

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Data', alinhamento: 'centro' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: 'Em relação ao vencimento' },
  { rotulo: 'Forma' },
  { rotulo: 'Registrado por' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

export function Liquidacoes({ titulo }: { readonly titulo: DetalheDoTitulo }) {
  if (titulo.liquidacoes.length === 0)
    return <p className="text-body-sm text-stone">Nenhum recebimento registrado neste título.</p>;
  return (
    <Tabela colunas={COLUNAS} larguraMinima={560}>
      {titulo.liquidacoes.map((liquidacao) => (
        <LinhaDaTabela key={liquidacao.id}>
          <Celula coluna={coluna(0)}>{formatarData(liquidacao.data)}</Celula>
          <Celula coluna={coluna(1)} forte>
            {formatarMoeda(liquidacao.valorCentavos)}
          </Celula>
          <Celula coluna={coluna(2)}>
            {pagamentoPorExtenso(liquidacao.diasEmRelacaoAoVencimento)}
          </Celula>
          <Celula coluna={coluna(3)}>
            {ROTULO_DA_FORMA[liquidacao.forma]}
            {liquidacao.referenciaBancaria && (
              <span className="text-stone"> · ref. {liquidacao.referenciaBancaria}</span>
            )}
          </Celula>
          <Celula coluna={coluna(4)}>
            <span title={liquidacao.registradoPor}>
              {liquidacao.registradoPorNome ?? 'Usuário sem nome no cadastro'}
            </span>
          </Celula>
        </LinhaDaTabela>
      ))}
    </Tabela>
  );
}

export function EventosDoTitulo({ titulo }: { readonly titulo: DetalheDoTitulo }) {
  return (
    <LinhaDoTempo
      formatar={formatarDataHora}
      itens={titulo.eventos.map((evento, indice) => ({
        chave: `${evento.tipo}-${indice}`,
        em: evento.em,
        titulo: evento.descricao,
        detalhe: evento.detalhe,
      }))}
    />
  );
}

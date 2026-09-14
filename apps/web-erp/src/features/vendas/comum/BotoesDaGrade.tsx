import {
  Copy,
  Hash,
  Lightbulb,
  Package,
  Pencil,
  Percent,
  Shapes,
  Tag,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { BOTAO_PEQUENO } from '../../cadastros/comum/estilos';

/** Alterar, Excluir, Copiar, Desc., Produto, Sugestão, Similar, Lote e Série:
 *  os botões que agem sobre o item escolhido na grade. */

export type AcaoDaGrade =
  | 'alterar'
  | 'excluir'
  | 'copiar'
  | 'desconto'
  | 'produto'
  | 'sugestao'
  | 'similar'
  | 'lote'
  | 'serie';

const BOTOES: Readonly<
  Record<AcaoDaGrade, { rotulo: string; icone: LucideIcon; precisaDeLinha: boolean }>
> = {
  alterar: { rotulo: 'Alterar', icone: Pencil, precisaDeLinha: true },
  excluir: { rotulo: 'Excluir', icone: Trash2, precisaDeLinha: true },
  copiar: { rotulo: 'Copiar', icone: Copy, precisaDeLinha: true },
  desconto: { rotulo: 'Desc.', icone: Percent, precisaDeLinha: false },
  produto: { rotulo: 'Produto', icone: Package, precisaDeLinha: false },
  sugestao: { rotulo: 'Sugestão', icone: Lightbulb, precisaDeLinha: false },
  similar: { rotulo: 'Similar', icone: Shapes, precisaDeLinha: false },
  lote: { rotulo: 'Lote', icone: Tag, precisaDeLinha: true },
  serie: { rotulo: 'Série', icone: Hash, precisaDeLinha: true },
};

export function BotoesDaGrade({
  acoes,
  temLinha,
  temItens,
  aoAcionar,
}: {
  readonly acoes: readonly AcaoDaGrade[];
  readonly temLinha: boolean;
  readonly temItens: boolean;
  readonly aoAcionar: (acao: AcaoDaGrade) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Ações do item">
      {acoes.map((acao) => {
        const { rotulo, icone: Icone, precisaDeLinha } = BOTOES[acao];
        const desabilitado = precisaDeLinha ? !temLinha : acao === 'desconto' && !temItens;
        return (
          <button
            key={acao}
            type="button"
            disabled={desabilitado}
            onClick={() => aoAcionar(acao)}
            className={BOTAO_PEQUENO}
          >
            <Icone size={13} aria-hidden="true" />
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

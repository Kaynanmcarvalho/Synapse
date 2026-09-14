import { BadgePercent, Target } from 'lucide-react';
import { Bloco, Grade } from '../../customers/campos';
import {
  CampoCaixa,
  CampoSelecao,
  CampoTexto,
  type LigacaoDaFicha,
} from '../../cadastros/comum/CamposDaFicha';
import { mascararValor } from '../../cadastros/comum/mascaras';

/** Aba Comissão: se vende, quanto ganha à vista e a prazo, sobre o quê, o maior
 *  desconto que dá sozinho e a meta do mês. O Ponto de Vendas e o PDV leem daqui. */

const BASE = [
  ['FATURAMENTO', 'Sobre o faturado'],
  ['RECEBIMENTO', 'Sobre o recebido'],
] as const;

export function AbaComissao({ ficha }: { readonly ficha: LigacaoDaFicha }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bloco titulo="Vendedor" icone={BadgePercent} descricao="Percentuais sobre o valor do pedido">
        <div className="mb-4">
          <CampoCaixa
            ficha={ficha}
            caminho="comissao.vendedor"
            rotulo="É vendedor"
            dica="Aparece no campo Vendedor do Ponto de Vendas e do PDV"
          />
        </div>
        <Grade colunas={2}>
          <CampoTexto
            ficha={ficha}
            caminho="comissao.percentualAVista"
            rotulo="% sobre venda à vista"
            mascara={mascararValor}
            inputMode="decimal"
          />
          <CampoTexto
            ficha={ficha}
            caminho="comissao.percentualAPrazo"
            rotulo="% sobre venda a prazo"
            mascara={mascararValor}
            inputMode="decimal"
          />
          <CampoSelecao
            ficha={ficha}
            caminho="comissao.base"
            rotulo="Base da comissão"
            opcoes={BASE}
          />
          <CampoTexto
            ficha={ficha}
            caminho="comissao.descontoMaximoPercentual"
            rotulo="Desconto máximo (%)"
            mascara={mascararValor}
            inputMode="decimal"
            dica="Acima disso o balcão recusa o desconto"
          />
        </Grade>
      </Bloco>
      <Bloco titulo="Meta" icone={Target} descricao="Acompanhada na aba Relatórios">
        <Grade colunas={2}>
          <CampoTexto
            ficha={ficha}
            caminho="comissao.metaMensal"
            rotulo="Meta mensal de vendas (R$)"
            mascara={mascararValor}
            inputMode="decimal"
            largura={2}
          />
        </Grade>
      </Bloco>
    </div>
  );
}

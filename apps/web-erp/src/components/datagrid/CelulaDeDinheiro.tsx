import { DataGridCelula, Text, type DataGridCelulaProps } from '@synapse/sdl';
import { separarMoeda } from '../../lib/dinheiro';

const PESO: Record<'normal' | 'forte' | 'apagado', string> = {
  normal: '',
  forte: 'text-ink font-semibold',
  apagado: 'text-stone',
};

export interface CelulaDeDinheiroProps extends Omit<
  DataGridCelulaProps,
  'papel' | 'alinhamento' | 'children'
> {
  readonly valorFormatado: string;
  readonly peso?: 'normal' | 'forte' | 'apagado';
}

/** Célula de dinheiro reutilizável: separa "R$" do número (via
 *  `lib/dinheiro.ts`, o utilitário que corrigiu o bug do NBSP na Fase 4.3) e
 *  aplica `font-data` alinhado à direita — a mesma regra de Home, Clientes e
 *  fila de crédito, agora num só lugar em vez de reimplementada em cada
 *  tabela. */
export function CelulaDeDinheiro({
  valorFormatado,
  peso = 'normal',
  className,
  ...resto
}: CelulaDeDinheiroProps) {
  const { prefixo, numero } = separarMoeda(valorFormatado);
  return (
    <DataGridCelula papel="data" alinhamento="direita" className={className} {...resto}>
      <Text variant="dado" className={PESO[peso]}>
        {prefixo && <span className="text-ink-apoio mr-1 font-normal">{prefixo}</span>}
        {numero}
      </Text>
    </DataGridCelula>
  );
}

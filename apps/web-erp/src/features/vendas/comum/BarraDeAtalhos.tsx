import { formatarMoeda } from '../../customers/formato';
import type { TotaisDaVenda } from './itens';

/** A faixa de teclas do rodapé ("F3 Finalizar Venda"): cada tecla também é um
 *  botão, para quem usa o mouse ou a tela de toque. */

export interface AtalhoDaBarra {
  readonly tecla: string;
  readonly rotulo: string;
  readonly acao: () => void;
  readonly principal?: boolean;
  readonly desabilitado?: boolean;
}

export function BarraDeAtalhos({ atalhos }: { readonly atalhos: readonly AtalhoDaBarra[] }) {
  return (
    <nav
      aria-label="Atalhos da venda"
      className="border-hairline-light flex flex-wrap items-center gap-1.5 rounded-2xl border bg-white p-2"
    >
      {atalhos.map((atalho) => (
        <button
          key={atalho.tecla + atalho.rotulo}
          type="button"
          onClick={atalho.acao}
          disabled={atalho.desabilitado}
          className={`text-caption inline-flex h-9 items-center gap-2 rounded-xl px-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            atalho.principal
              ? 'bg-canvas-dark hover:bg-charcoal ml-auto text-white'
              : 'bg-surface-soft text-ink hover:bg-[#ececee]'
          }`}
        >
          {atalho.tecla ? (
            <kbd
              className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${
                atalho.principal ? 'bg-white/15 text-white' : 'text-charcoal bg-white'
              }`}
            >
              {atalho.tecla}
            </kbd>
          ) : null}
          {atalho.rotulo}
        </button>
      ))}
    </nav>
  );
}

const quantidade = (valor: number) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

export function PainelDeTotais({
  totais,
  mostrarPeso = false,
}: {
  readonly totais: TotaisDaVenda;
  readonly mostrarPeso?: boolean;
}) {
  const campos = [
    { rotulo: 'Itens', valor: String(totais.itens) },
    { rotulo: 'Volumes', valor: quantidade(totais.volumes) },
    ...(mostrarPeso ? [{ rotulo: 'Peso (kg)', valor: quantidade(totais.pesoKg) }] : []),
    { rotulo: 'Total Bruto', valor: formatarMoeda(totais.brutoCentavos) },
    { rotulo: 'Descontos', valor: formatarMoeda(totais.descontosCentavos), perigo: true },
  ];
  return (
    <div className="border-hairline-light flex flex-wrap items-stretch gap-px overflow-hidden rounded-2xl border bg-[#e9e9ec]">
      {campos.map((campo) => (
        <div key={campo.rotulo} className="min-w-[7rem] flex-1 bg-white px-4 py-2.5">
          <p className="text-caption text-stone">{campo.rotulo}</p>
          <p
            className={`text-body-md font-semibold tabular-nums ${
              'perigo' in campo && totais.descontosCentavos ? 'text-[#b3242f]' : 'text-ink'
            }`}
          >
            {campo.valor}
          </p>
        </div>
      ))}
      <div className="bg-canvas-dark min-w-[12rem] flex-[1.4] px-5 py-2.5 text-white">
        <p className="text-caption text-white/70">Total Líquido</p>
        <p className="font-display text-heading-sm tabular-nums tracking-[-0.3px]">
          {formatarMoeda(totais.liquidoCentavos)}
        </p>
      </div>
    </div>
  );
}

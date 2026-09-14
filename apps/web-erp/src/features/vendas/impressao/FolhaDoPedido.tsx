/* eslint-disable max-lines-per-function */
import type { ImpressaoDoPedido } from '@synapse/types';
import { formatarDocumento, formatarTelefone } from '../../customers/formato';
import { dataEHora } from '../comum/datas';

/** O "PEDIDO DE VENDA (SEM VALOR FISCAL)" numa folha A4, como o Syndata
 *  imprime: cabeçalho com a logo e a empresa, número, vendedor e assessor,
 *  bloco do cliente, pagamento, itens com peso, totais e assinaturas. */

const moeda = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const quantidade = (milesimos: number) =>
  (milesimos / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

const peso = (kg: number) =>
  kg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });

function Linha({ rotulo, valor }: { readonly rotulo: string; readonly valor: string | null }) {
  return (
    <p className="flex min-w-0 gap-1.5">
      <span className="shrink-0 font-bold">{rotulo}:</span>
      <span className="min-w-0 truncate">{valor || '—'}</span>
    </p>
  );
}

export function FolhaDoPedido({ pedido }: { readonly pedido: ImpressaoDoPedido }) {
  const { empresa, cliente } = pedido;
  const totais: readonly (readonly [string, string])[] = [
    ['Total Bruto', moeda(pedido.totalBrutoCentavos)],
    ['Frete (+)', moeda(pedido.freteCentavos)],
    ['Acréscimos (+)', moeda(pedido.acrescimosCentavos)],
    ['Descontos (-)', moeda(pedido.descontosCentavos)],
    ['Peso Total', `${peso(pedido.pesoTotalKg)} kg`],
  ];

  return (
    <article className="folha-do-pedido mx-auto flex w-[210mm] max-w-full flex-col bg-white p-[10mm] font-sans text-[11px] leading-snug text-black">
      <header className="flex items-stretch gap-3 border border-black">
        <div className="flex w-[34mm] shrink-0 items-center justify-center border-r border-black p-2">
          {empresa.logoUrl ? (
            <img src={empresa.logoUrl} alt={empresa.nome} className="max-h-[22mm] object-contain" />
          ) : (
            <span className="text-center text-[15px] font-black uppercase">{empresa.nome}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 py-2">
          <p className="text-[14px] font-black uppercase">{empresa.razaoSocial}</p>
          {empresa.nome !== empresa.razaoSocial ? (
            <p className="uppercase">{empresa.nome}</p>
          ) : null}
          <p>
            CNPJ: {formatarDocumento(empresa.documento) || '—'} · IE:{' '}
            {empresa.inscricaoEstadual || '—'}
          </p>
          <p className="truncate">
            {[empresa.endereco, empresa.cidadeUf, empresa.cep ? `CEP ${empresa.cep}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {empresa.telefone ? <p>Telefone: {formatarTelefone(empresa.telefone)}</p> : null}
        </div>
        <div className="flex w-[42mm] shrink-0 flex-col justify-center border-l border-black p-2 text-center">
          <p className="text-[10px] font-bold uppercase">Nº do pedido</p>
          <p className="text-[22px] font-black tabular-nums">{pedido.numero}</p>
          {pedido.situacao ? <p className="text-[10px] uppercase">{pedido.situacao}</p> : null}
        </div>
      </header>

      <h1 className="my-2 border-y-2 border-black py-1 text-center text-[14px] font-black tracking-wide">
        {pedido.titulo}
      </h1>

      <section className="grid grid-cols-2 gap-x-6 border border-black px-2 py-1.5">
        <Linha rotulo="Vendedor" valor={pedido.vendedor} />
        <Linha rotulo="Assessor" valor={pedido.assessor} />
      </section>

      <section className="mt-2 border border-black px-2 py-1.5">
        <Linha
          rotulo="Cliente"
          valor={cliente.codigo ? `${cliente.codigo} - ${cliente.nome}` : cliente.nome}
        />
        <Linha rotulo="Fantasia" valor={cliente.fantasia} />
        <Linha rotulo="Endereço" valor={cliente.endereco} />
        <div className="grid grid-cols-3 gap-x-4">
          <Linha rotulo="CNPJ/CPF" valor={formatarDocumento(cliente.documento)} />
          <Linha rotulo="IE" valor={cliente.inscricaoEstadual} />
          <Linha rotulo="Telefone" valor={formatarTelefone(cliente.telefone)} />
        </div>
      </section>

      <table className="mt-2 w-full border-collapse border border-black">
        <thead>
          <tr className="bg-[#e6e6e6] text-left">
            <th className="border border-black px-2 py-1">Forma de Pagamento</th>
            <th className="w-[40mm] border border-black px-2 py-1 text-right">Valor Pagto</th>
          </tr>
        </thead>
        <tbody>
          {pedido.pagamentos.map((pagamento, indice) => (
            <tr key={`${pagamento.descricao}-${indice}`}>
              <td className="border border-black px-2 py-0.5">
                {pagamento.descricao}
                {indice === 0 && pedido.condicaoDePagamento
                  ? ` · ${pedido.condicaoDePagamento}`
                  : ''}
              </td>
              <td className="border border-black px-2 py-0.5 text-right tabular-nums">
                {moeda(pagamento.valorCentavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="mt-2 w-full border-collapse border border-black">
        <thead>
          <tr className="bg-[#e6e6e6] text-left">
            <th className="w-[22mm] border border-black px-1.5 py-1">Código</th>
            <th className="border border-black px-1.5 py-1">Descrição</th>
            <th className="w-[16mm] border border-black px-1.5 py-1 text-right">Qtde</th>
            <th className="w-[10mm] border border-black px-1.5 py-1">UN</th>
            <th className="w-[16mm] border border-black px-1.5 py-1 text-right">Peso</th>
            <th className="w-[22mm] border border-black px-1.5 py-1 text-right">Valor Unitário</th>
            <th className="w-[24mm] border border-black px-1.5 py-1 text-right">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          {pedido.itens.map((item, indice) => (
            <tr key={`${item.codigo}-${indice}`} className="break-inside-avoid">
              <td className="border border-black px-1.5 py-0.5 tabular-nums">{item.codigo}</td>
              <td className="border border-black px-1.5 py-0.5">
                {item.descricao}
                {item.lote ? <span className="text-[9px]"> · Lote {item.lote}</span> : null}
                {item.descontoCentavos ? (
                  <span className="text-[9px]"> · Desc. {moeda(item.descontoCentavos)}</span>
                ) : null}
              </td>
              <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
                {quantidade(item.quantidade)}
              </td>
              <td className="border border-black px-1.5 py-0.5">{item.unidade}</td>
              <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
                {peso(item.pesoKg)}
              </td>
              <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
                {moeda(item.valorUnitarioCentavos)}
              </td>
              <td className="border border-black px-1.5 py-0.5 text-right tabular-nums">
                {moeda(item.valorTotalCentavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-2 flex break-inside-avoid gap-3">
        <div className="min-w-0 flex-1 border border-black px-2 py-1.5">
          <p className="font-bold">Observação:</p>
          <p className="whitespace-pre-wrap">{pedido.observacao || '—'}</p>
        </div>
        <dl className="grid w-[70mm] shrink-0 grid-cols-[1fr_auto] border border-black">
          {totais.map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="border-b border-black px-2 py-0.5 font-bold">{rotulo}</dt>
              <dd className="border-b border-black px-2 py-0.5 text-right tabular-nums">{valor}</dd>
            </div>
          ))}
          <dt className="bg-[#e6e6e6] px-2 py-1 text-[13px] font-black">Total Líquido</dt>
          <dd className="bg-[#e6e6e6] px-2 py-1 text-right text-[13px] font-black tabular-nums">
            {moeda(pedido.totalLiquidoCentavos)}
          </dd>
        </dl>
      </section>

      <section className="mt-12 grid break-inside-avoid grid-cols-2 gap-16 px-6 text-center">
        <p className="border-t border-black pt-1">Vendedor</p>
        <p className="border-t border-black pt-1">Cliente</p>
      </section>

      <footer className="rodape-da-folha mt-6 flex justify-between border-t border-black pt-1 text-[10px]">
        <span>Emissão: {dataEHora(pedido.emitidoEm)}</span>
        <span className="so-na-tela">Página 1 de 1</span>
      </footer>
    </article>
  );
}

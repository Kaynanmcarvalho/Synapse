/* eslint-disable max-lines-per-function */
import type { DocumentosDoFornecedor, LinhaDeTituloDoFornecedor } from '@synapse/types';
import { CircleDollarSign, LoaderCircle, PackageCheck, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bloco } from '../../customers/campos';
import { formatarData, formatarMoeda } from '../../customers/formato';
import { documentosDoFornecedor } from '../fornecedores.api';

/** Aba Documentos: o que o sistema já registrou com este fornecedor — pedidos
 *  de compra e títulos a pagar. Nada é digitado aqui. */

const SITUACAO_DO_PEDIDO: Readonly<Record<string, string>> = {
  RASCUNHO: 'Rascunho',
  EM_COTACAO: 'Em cotação',
  APROVADO: 'Aprovado',
  RECEBIDO_PARCIAL: 'Recebido parcial',
  RECEBIDO: 'Recebido',
  CANCELADO: 'Cancelado',
};

function Titulos({
  titulos,
  vazio,
}: {
  readonly titulos: readonly LinhaDeTituloDoFornecedor[];
  readonly vazio: string;
}) {
  if (titulos.length === 0) return <p className="text-body-sm text-stone">{vazio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px]">
        <thead>
          <tr className="text-caption text-stone border-hairline-light border-b text-left">
            <th className="px-3 py-2 font-medium">Descrição</th>
            <th className="px-3 py-2 font-medium">Vencimento</th>
            <th className="px-3 py-2 font-medium">Situação</th>
            <th className="px-3 py-2 text-right font-medium">Valor</th>
            <th className="px-3 py-2 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {titulos.map((titulo) => (
            <tr
              key={titulo.id}
              className="border-hairline-light text-body-sm border-b last:border-0"
            >
              <td className="text-ink px-3 py-2">{titulo.descricao}</td>
              <td className="text-charcoal px-3 py-2 tabular-nums">
                {formatarData(titulo.vencimento)}
              </td>
              <td className="text-charcoal px-3 py-2">{titulo.situacao}</td>
              <td className="text-ink px-3 py-2 text-right tabular-nums">
                {formatarMoeda(titulo.valorCentavos)}
              </td>
              <td className="text-ink px-3 py-2 text-right tabular-nums">
                {formatarMoeda(titulo.saldoCentavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AbaDocumentos({ fornecedorId }: { readonly fornecedorId: string | null }) {
  const [documentos, setDocumentos] = useState<DocumentosDoFornecedor | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!fornecedorId) return undefined;
    documentosDoFornecedor(fornecedorId)
      .then((valor) => ativo && setDocumentos(valor))
      .catch(
        (falha: unknown) =>
          ativo && setErro(falha instanceof Error ? falha.message : 'Falha ao carregar'),
      );
    return () => {
      ativo = false;
    };
  }, [fornecedorId]);

  if (!fornecedorId) {
    return (
      <p className="text-body-sm text-stone py-10 text-center">
        Salve o cadastro para ver os documentos deste fornecedor.
      </p>
    );
  }
  if (erro) return <p className="text-body-sm py-10 text-center text-[#b3242f]">{erro}</p>;
  if (!documentos) {
    return (
      <p className="text-body-sm text-stone flex items-center justify-center gap-2 py-10">
        <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
      </p>
    );
  }
  const emAberto = documentos.titulosEmAberto.reduce(
    (soma, titulo) => soma + titulo.saldoCentavos,
    0,
  );
  return (
    <div className="grid gap-4">
      <Bloco
        titulo="Títulos a pagar em aberto"
        icone={Wallet}
        descricao={`Saldo ${formatarMoeda(emAberto)}`}
      >
        <Titulos titulos={documentos.titulosEmAberto} vazio="Nada em aberto com este fornecedor." />
      </Bloco>
      <Bloco titulo="Pedidos de compra" icone={PackageCheck}>
        {documentos.pedidosDeCompra.length === 0 ? (
          <p className="text-body-sm text-stone">Nenhum pedido de compra com este fornecedor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="text-caption text-stone border-hairline-light border-b text-left">
                  <th className="px-3 py-2 font-medium">Pedido</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Situação</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {documentos.pedidosDeCompra.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="border-hairline-light text-body-sm border-b last:border-0"
                  >
                    <td className="text-ink px-3 py-2 tabular-nums">{pedido.numero}</td>
                    <td className="text-charcoal px-3 py-2 tabular-nums">
                      {formatarData(pedido.criadoEm)}
                    </td>
                    <td className="text-charcoal px-3 py-2">
                      {SITUACAO_DO_PEDIDO[pedido.situacao] ?? pedido.situacao}
                    </td>
                    <td className="text-ink px-3 py-2 text-right tabular-nums">
                      {formatarMoeda(pedido.totalCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloco>
      <Bloco titulo="Títulos pagos" icone={CircleDollarSign}>
        <Titulos titulos={documentos.titulosPagos} vazio="Nenhum título pago ainda." />
      </Bloco>
    </div>
  );
}

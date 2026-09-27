/* eslint-disable max-lines-per-function */
import { classesDaLinha, DataGridCabecalho, DataGridCelula, Spinner, Text } from '@synapse/sdl';
import type { DocumentosDoFornecedor, LinhaDeTituloDoFornecedor } from '@synapse/types';
import { CircleDollarSign, PackageCheck, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CelulaDeDinheiro } from '../../../components/datagrid/CelulaDeDinheiro';
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

/** Só leitura: nenhuma linha abre documento nem tem ação. */
const LINHA = classesDaLinha({ clicavel: false, focoComAnel: false });

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
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-hairline-light border-b">
            <DataGridCabecalho id="descricao" rotulo="Descrição" />
            <DataGridCabecalho id="vencimento" rotulo="Vencimento" />
            <DataGridCabecalho id="situacao" rotulo="Situação" />
            <DataGridCabecalho id="valor" rotulo="Valor" alinhamento="direita" />
            <DataGridCabecalho id="saldo" rotulo="Saldo" alinhamento="direita" />
          </tr>
        </thead>
        <tbody>
          {titulos.map((titulo) => (
            <tr key={titulo.id} className={LINHA}>
              <DataGridCelula papel="primary" truncar={false}>
                <Text variant="corpo">{titulo.descricao}</Text>
              </DataGridCelula>
              <DataGridCelula papel="data" truncar={false}>
                <Text variant="dado">{formatarData(titulo.vencimento)}</Text>
              </DataGridCelula>
              <DataGridCelula papel="secondary" truncar={false}>
                <Text variant="corpoSecundario">{titulo.situacao}</Text>
              </DataGridCelula>
              <CelulaDeDinheiro
                truncar={false}
                valorFormatado={formatarMoeda(titulo.valorCentavos)}
              />
              <CelulaDeDinheiro
                truncar={false}
                peso="forte"
                valorFormatado={formatarMoeda(titulo.saldoCentavos)}
              />
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
  if (erro) return <p className="text-body-sm text-status-perigo py-10 text-center">{erro}</p>;
  if (!documentos) {
    return (
      <p className="text-body-sm text-stone flex items-center justify-center gap-2 py-10">
        <Spinner size={15} decorative /> Carregando…
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
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="border-hairline-light border-b">
                  <DataGridCabecalho id="pedido" rotulo="Pedido" />
                  <DataGridCabecalho id="data" rotulo="Data" />
                  <DataGridCabecalho id="situacao" rotulo="Situação" />
                  <DataGridCabecalho id="total" rotulo="Total" alinhamento="direita" />
                </tr>
              </thead>
              <tbody>
                {documentos.pedidosDeCompra.map((pedido) => (
                  <tr key={pedido.id} className={LINHA}>
                    <DataGridCelula papel="data" truncar={false}>
                      <Text variant="dado" className="font-medium">
                        {pedido.numero}
                      </Text>
                    </DataGridCelula>
                    <DataGridCelula papel="data" truncar={false}>
                      <Text variant="dado">{formatarData(pedido.criadoEm)}</Text>
                    </DataGridCelula>
                    <DataGridCelula papel="secondary" truncar={false}>
                      <Text variant="corpoSecundario">
                        {SITUACAO_DO_PEDIDO[pedido.situacao] ?? pedido.situacao}
                      </Text>
                    </DataGridCelula>
                    <CelulaDeDinheiro
                      truncar={false}
                      valorFormatado={formatarMoeda(pedido.totalCentavos)}
                    />
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

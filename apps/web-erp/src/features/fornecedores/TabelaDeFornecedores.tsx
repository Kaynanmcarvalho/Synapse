import {
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Status,
  SynapseSignal,
  Text,
} from '@synapse/sdl';
import type { FornecedorNaLista } from '@synapse/types';
import { formatarDocumento, formatarTelefone } from '../customers/formato';

/** A tabela da lista de Fornecedores — mesma gramática de Clientes: leading
 *  discreto sem hairline, hairline-inset no resto, Synapse Signal por foco de
 *  teclado, situação binária via Status (dot, sem chip — não há exceção que
 *  justifique destacar). */

const COLUNAS = ['Código', 'Fornecedor', 'CNPJ / CPF', 'Cidade', 'Telefone', 'Grupo', 'Situação'];

function Linha({
  fornecedor,
  aoAbrir,
}: {
  readonly fornecedor: FornecedorNaLista;
  readonly aoAbrir: () => void;
}) {
  return (
    <tr
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') aoAbrir();
      }}
      className={classesDaLinha({ hairlineNaLinha: false, focoComAnel: false })}
    >
      <DataGridCelula papel="leading" truncar={false} className="pl-1 pr-3">
        <SynapseSignal gatilho="foco-do-grupo" />
        <Text variant="dado" tone="sutil" className="text-body-sm pl-2">
          {fornecedor.codigo ?? '—'}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="primary" truncar={false} comHairline>
        <Text variant="corpo" className="block font-medium">
          {fornecedor.nomeFantasia}
        </Text>
        {fornecedor.razaoSocial !== fornecedor.nomeFantasia ? (
          <Text variant="legenda" tone="apoio" className="block truncate">
            {fornecedor.razaoSocial}
          </Text>
        ) : null}
      </DataGridCelula>
      <DataGridCelula papel="data" truncar={false} comHairline>
        <Text variant="dado">{formatarDocumento(fornecedor.documento)}</Text>
      </DataGridCelula>
      <DataGridCelula papel="secondary" truncar={false} comHairline>
        <Text variant="corpoSecundario">
          {fornecedor.uf ? `${fornecedor.cidade}/${fornecedor.uf}` : fornecedor.cidade || '—'}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="data" truncar={false} comHairline>
        <Text variant="dado">{formatarTelefone(fornecedor.telefone) || '—'}</Text>
      </DataGridCelula>
      <DataGridCelula papel="secondary" truncar={false} comHairline>
        <Text variant="corpoSecundario">{fornecedor.grupo ?? '—'}</Text>
      </DataGridCelula>
      <DataGridCelula papel="status" truncar={false} comHairline>
        <Status tone={fornecedor.ativo ? 'ok' : 'neutro'}>
          {fornecedor.ativo ? 'Ativo' : 'Inativo'}
        </Status>
      </DataGridCelula>
    </tr>
  );
}

export function TabelaDeFornecedores({
  itens,
  aoAbrir,
}: {
  readonly itens: readonly FornecedorNaLista[];
  readonly aoAbrir: (id: string) => void;
}) {
  return (
    <table className="w-full min-w-[880px] border-collapse">
      <thead>
        <tr className="border-hairline-light border-b">
          {COLUNAS.map((rotulo, indice) => (
            <DataGridCabecalho
              key={rotulo}
              id={rotulo}
              rotulo={rotulo}
              className={indice === 0 ? 'pl-1 pr-3' : undefined}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {itens.map((fornecedor) => (
          <Linha
            key={fornecedor.id}
            fornecedor={fornecedor}
            aoAbrir={() => aoAbrir(fornecedor.id)}
          />
        ))}
      </tbody>
    </table>
  );
}

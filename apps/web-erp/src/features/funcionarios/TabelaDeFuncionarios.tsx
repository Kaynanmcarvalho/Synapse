import {
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Status,
  SynapseSignal,
  Text,
} from '@synapse/sdl';
import type { FuncionarioNaLista } from '@synapse/types';
import { formatarTelefone } from '../customers/formato';

/** A tabela da lista de Funcionários — mesma gramática de Clientes (leading
 *  discreto sem hairline, hairline-inset no resto, Synapse Signal por foco
 *  de teclado). Situação aqui pode empilhar mais de uma etiqueta ao mesmo
 *  tempo (vendedor + bloqueado, por exemplo) — diferente de Clientes, que
 *  tem uma situação só. Preservado exatamente: nenhuma condição nova. */

const COLUNAS = [
  'Código',
  'Nome',
  'Matrícula',
  'Cargo',
  'Departamento',
  'Celular / Telefone',
  'Situação',
];

function Etiquetas({ funcionario }: { readonly funcionario: FuncionarioNaLista }) {
  if (funcionario.vendedor || funcionario.bloqueado || funcionario.demitido) {
    return (
      <span className="flex flex-wrap gap-1">
        {funcionario.vendedor && (
          <Status tone="info" variant="chip">
            Vendedor
          </Status>
        )}
        {funcionario.bloqueado && (
          <Status tone="bloqueado" variant="chip">
            Bloqueado
          </Status>
        )}
        {funcionario.demitido && (
          <Status tone="perigo" variant="chip">
            Demitido
          </Status>
        )}
      </span>
    );
  }
  return <Status tone="ok">Ativo</Status>;
}

function Linha({
  funcionario,
  aoAbrir,
}: {
  readonly funcionario: FuncionarioNaLista;
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
          {funcionario.codigo}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="primary" truncar={false} comHairline>
        <Text variant="corpo" className="font-medium">
          {funcionario.nome}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="data" truncar={false} comHairline>
        <Text variant="dado">{funcionario.matricula ?? '—'}</Text>
      </DataGridCelula>
      <DataGridCelula papel="secondary" truncar={false} comHairline>
        <Text variant="corpoSecundario">{funcionario.cargo}</Text>
      </DataGridCelula>
      <DataGridCelula papel="secondary" truncar={false} comHairline>
        <Text variant="corpoSecundario">{funcionario.departamento}</Text>
      </DataGridCelula>
      <DataGridCelula papel="data" truncar={false} comHairline>
        <Text variant="dado">{formatarTelefone(funcionario.telefone) || '—'}</Text>
      </DataGridCelula>
      <DataGridCelula papel="status" truncar={false} comHairline>
        <Etiquetas funcionario={funcionario} />
      </DataGridCelula>
    </tr>
  );
}

export function TabelaDeFuncionarios({
  itens,
  aoAbrir,
}: {
  readonly itens: readonly FuncionarioNaLista[];
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
        {itens.map((funcionario) => (
          <Linha
            key={funcionario.id}
            funcionario={funcionario}
            aoAbrir={() => aoAbrir(funcionario.id)}
          />
        ))}
      </tbody>
    </table>
  );
}

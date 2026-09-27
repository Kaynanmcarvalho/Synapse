import {
  Button,
  DataGridCabecalho,
  DataGridCelula,
  Input,
  Select,
  Spinner,
  Status,
  Surface,
  Text,
} from '@synapse/sdl';
import type { ItemDeTabela, MeioDePagamento, TipoDeTabela } from '@synapse/types';
import { MEIOS_DE_PAGAMENTO, ROTULO_DA_TABELA, ROTULO_DO_MEIO } from '@synapse/types';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { NovoItemDeTabela } from '../comum/BuscaDeTabela';
import { alterarItemDeTabela, listarTabela } from '../comum/cadastros.api';

/** As tabelas auxiliares do Syndata (Praças e Regiões, Departamentos, Cargos,
 *  Grupos e Sub-Grupos de Fornecedores): código, nome e se está ativo. O código
 *  1 é o "GERAL" das fichas novas e fica sempre ativo.
 *
 *  Primeira tela no vocabulário do SDL (Fase 2) — já sem cor solta, uppercase
 *  ou pílula antes de a fundação de DataGrid existir. A Fase 5.2 traz
 *  cabeçalho e célula para os primitives compartilhados (`DataGridCabecalho`/
 *  `DataGridCelula`), mas NÃO usa `classesDaLinha`: a linha aqui não abre
 *  nada e não tem hover — cada ação é um botão próprio, não a linha inteira.
 *  Forçar a gramática de linha clicável numa linha que não é clicável seria
 *  pior do que não usar a fundação. */

const DESCRICAO: Readonly<Record<TipoDeTabela, string>> = {
  cargos:
    'Cargo do funcionário (vendedor, gerente, motorista…). As permissões de acesso ficam em Ferramentas › Manutenção de Usuários.',
  departamentos: 'Departamento do funcionário.',
  pracas: 'Praça ou região de atendimento — usada no funcionário e no fornecedor.',
  'grupos-de-fornecedor': 'Agrupamento dos fornecedores para filtro e relatório.',
  'subgrupos-de-fornecedor': 'Subdivisão dos grupos de fornecedores.',
  'formas-de-pagamento': 'Como o cliente paga no Ponto de Vendas e no PDV.',
};

interface EdicaoDaLinha {
  readonly tipo: TipoDeTabela;
  readonly nome: string;
  readonly meio: MeioDePagamento;
  readonly gravando: boolean;
  readonly aoMudarNome: (nome: string) => void;
  readonly aoMudarMeio: (meio: MeioDePagamento) => void;
  readonly aoConfirmar: () => void;
  readonly aoCancelar: () => void;
}

function CamposDaLinha(props: EdicaoDaLinha) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        density="compacta"
        aria-label="Nome"
        value={props.nome}
        maxLength={60}
        className="max-w-sm"
        onChange={(evento) => props.aoMudarNome(evento.target.value.toLocaleUpperCase('pt-BR'))}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') props.aoConfirmar();
          if (evento.key === 'Escape') props.aoCancelar();
        }}
      />
      {props.tipo === 'formas-de-pagamento' ? (
        <Select
          density="compacta"
          aria-label="Como funciona no caixa"
          value={props.meio}
          className="max-w-[14rem]"
          onChange={(evento) => props.aoMudarMeio(evento.target.value as MeioDePagamento)}
        >
          {MEIOS_DE_PAGAMENTO.map((opcao) => (
            <option key={opcao} value={opcao}>
              {ROTULO_DO_MEIO[opcao]}
            </option>
          ))}
        </Select>
      ) : null}
      <Button
        variant="primary"
        density="compacta"
        loading={props.gravando}
        onClick={props.aoConfirmar}
      >
        {props.gravando ? null : <Check size={14} aria-hidden="true" />} Salvar
      </Button>
      <Button variant="quiet" density="compacta" onClick={props.aoCancelar}>
        <X size={14} aria-hidden="true" /> Cancelar
      </Button>
    </div>
  );
}

function AcoesDaLinha({
  item,
  tipo,
  gravando,
  aoRenomear,
  aoAlternarSituacao,
}: {
  readonly item: ItemDeTabela;
  readonly tipo: TipoDeTabela;
  readonly gravando: boolean;
  readonly aoRenomear: () => void;
  readonly aoAlternarSituacao: () => void;
}) {
  // O codigo 1 e o "GERAL" que as fichas novas usam: nao pode ser inativado.
  const fixo = item.codigo === 1 && tipo !== 'formas-de-pagamento';
  return (
    <span className="inline-flex gap-1">
      <Button variant="quiet" density="compacta" onClick={aoRenomear}>
        <Pencil size={14} aria-hidden="true" /> Renomear
      </Button>
      <Button
        variant="quiet"
        density="compacta"
        disabled={gravando || fixo}
        onClick={aoAlternarSituacao}
      >
        {item.ativo ? 'Inativar' : 'Ativar'}
      </Button>
    </span>
  );
}

/** Grava a alteração de uma linha e guarda o que aconteceu: em edição, salvando
 *  ou com aviso. A linha só compõe; quem fala com a API é isto. */
const useGravacaoDaLinha = (
  tipo: TipoDeTabela,
  item: ItemDeTabela,
  aoAlterar: (item: ItemDeTabela) => void,
  meio: MeioDePagamento,
) => {
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [editando, setEditando] = useState(false);

  const gravar = async (dados: { nome: string; ativo: boolean }) => {
    setGravando(true);
    setErro(null);
    try {
      aoAlterar(
        await alterarItemDeTabela(tipo, item.codigo, {
          ...dados,
          ...(tipo === 'formas-de-pagamento' ? { meio } : {}),
        }),
      );
      setEditando(false);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar');
    } finally {
      setGravando(false);
    }
  };

  return { erro, gravando, editando, setEditando, gravar };
};

function Linha({
  tipo,
  item,
  aoAlterar,
}: {
  readonly tipo: TipoDeTabela;
  readonly item: ItemDeTabela;
  readonly aoAlterar: (item: ItemDeTabela) => void;
}) {
  const [nome, setNome] = useState(item.nome);
  const [meio, setMeio] = useState<MeioDePagamento>(item.meio ?? 'OUTROS');
  const { erro, gravando, editando, setEditando, gravar } = useGravacaoDaLinha(
    tipo,
    item,
    aoAlterar,
    meio,
  );

  return (
    <tr className="border-hairline-light border-b last:border-0">
      <DataGridCelula papel="data" alinhamento="direita" truncar={false} className="w-20">
        <Text variant="dado" tone="sutil">
          {item.codigo}
        </Text>
      </DataGridCelula>
      <DataGridCelula papel="primary" truncar={false}>
        {editando ? (
          <CamposDaLinha
            tipo={tipo}
            nome={nome}
            meio={meio}
            gravando={gravando}
            aoMudarNome={setNome}
            aoMudarMeio={setMeio}
            aoConfirmar={() => void gravar({ nome, ativo: item.ativo })}
            aoCancelar={() => setEditando(false)}
          />
        ) : (
          <Text variant="corpo" as="span" className="font-medium">
            {item.nome}
          </Text>
        )}
        {erro ? (
          <Text variant="legenda" tone="perigo" className="mt-1 block">
            {erro}
          </Text>
        ) : null}
      </DataGridCelula>
      {tipo === 'formas-de-pagamento' ? (
        <DataGridCelula papel="secondary" truncar={false}>
          <Text variant="corpo" as="span">
            {item.meio ? ROTULO_DO_MEIO[item.meio] : '—'}
          </Text>
        </DataGridCelula>
      ) : null}
      <DataGridCelula papel="status" truncar={false}>
        <Status tone={item.ativo ? 'ok' : 'neutro'}>{item.ativo ? 'Ativo' : 'Inativo'}</Status>
      </DataGridCelula>
      <DataGridCelula papel="action" alinhamento="direita" truncar={false}>
        <AcoesDaLinha
          item={item}
          tipo={tipo}
          gravando={gravando}
          aoRenomear={() => setEditando(true)}
          aoAlternarSituacao={() => void gravar({ nome: item.nome, ativo: !item.ativo })}
        />
      </DataGridCelula>
    </tr>
  );
}

function TabelaDeItens({
  tipo,
  itens,
  aoAlterar,
}: {
  readonly tipo: TipoDeTabela;
  readonly itens: readonly ItemDeTabela[];
  readonly aoAlterar: (item: ItemDeTabela) => void;
}) {
  return (
    <table className="w-full min-w-[560px] border-collapse">
      <thead>
        <tr className="border-hairline-light border-b">
          <DataGridCabecalho id="codigo" rotulo="Código" alinhamento="direita" />
          <DataGridCabecalho id="nome" rotulo="Nome" />
          {tipo === 'formas-de-pagamento' ? (
            <DataGridCabecalho id="meio" rotulo="No caixa" />
          ) : null}
          <DataGridCabecalho id="situacao" rotulo="Situação" />
          <DataGridCabecalho id="acoes" rotulo="" />
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => (
          <Linha key={item.codigo} tipo={tipo} item={item} aoAlterar={aoAlterar} />
        ))}
      </tbody>
    </table>
  );
}

export function TabelaAuxiliarScreen({ tipo }: { readonly tipo: TipoDeTabela }) {
  const [itens, setItens] = useState<readonly ItemDeTabela[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setItens(await listarTabela(tipo));
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar a tabela');
      setItens([]);
    }
  }, [tipo]);

  useEffect(() => {
    setItens(null);
    void carregar();
  }, [carregar]);

  const substituir = (alterado: ItemDeTabela) =>
    setItens(
      (atuais) =>
        atuais?.map((item) => (item.codigo === alterado.codigo ? alterado : item)) ?? null,
    );

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 py-5">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text variant="tituloTela">{ROTULO_DA_TABELA[tipo]}</Text>
          <Text variant="corpoSecundario">{DESCRICAO[tipo]}</Text>
        </div>
        <Button variant="primary" onClick={() => setNovo(true)}>
          <Plus size={16} aria-hidden="true" /> Novo
        </Button>
      </header>

      <Surface className="overflow-x-auto">
        {erro ? (
          <Text variant="corpo" tone="perigo" className="p-4">
            {erro}
          </Text>
        ) : null}
        {itens === null ? (
          <div className="flex items-center gap-2 p-4">
            <Spinner label="Carregando a tabela" />
            <Text variant="corpo" tone="sutil" as="span">
              Carregando…
            </Text>
          </div>
        ) : (
          <TabelaDeItens tipo={tipo} itens={itens} aoAlterar={substituir} />
        )}
      </Surface>

      {novo ? (
        <NovoItemDeTabela
          tipo={tipo}
          aoFechar={() => setNovo(false)}
          aoCriar={(item) => {
            setNovo(false);
            setItens((atuais) => [...(atuais ?? []), item]);
          }}
        />
      ) : null}
    </main>
  );
}

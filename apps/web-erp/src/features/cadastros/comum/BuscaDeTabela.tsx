import { Button, Field, Input, Select, Spinner, Text } from '@synapse/sdl';
import type { ItemDeTabela, MeioDePagamento, TipoDeTabela } from '@synapse/types';
import { MEIOS_DE_PAGAMENTO, ROTULO_DA_TABELA, ROTULO_DO_MEIO } from '@synapse/types';
import { Modal } from '@synapse/ui';
import { FilePlus2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { criarItemDeTabela, listarTabela } from './cadastros.api';

/** A lista da lupa e o cadastro rápido de item de tabela auxiliar. */

function ListaDeItens({
  itens,
  erro,
  aoEscolher,
}: {
  readonly itens: readonly ItemDeTabela[] | null;
  readonly erro: string | null;
  readonly aoEscolher: (item: ItemDeTabela) => void;
}) {
  return (
    <div className="border-line-fina rounded-controle mt-3 max-h-[50vh] overflow-y-auto border">
      {erro ? (
        <Text variant="corpo" tone="perigo" className="p-4">
          {erro}
        </Text>
      ) : null}
      {!erro && itens === null ? (
        <div className="flex items-center gap-2 p-4">
          <Spinner label="Carregando a tabela" />
          <Text variant="corpo" tone="sutil" as="span">
            Carregando…
          </Text>
        </div>
      ) : null}
      {itens?.length === 0 ? (
        <Text variant="corpo" tone="sutil" className="p-4">
          Nada encontrado.
        </Text>
      ) : null}
      <ul>
        {itens?.map((item) => (
          <li key={item.codigo}>
            <button
              type="button"
              onClick={() => aoEscolher(item)}
              disabled={!item.ativo}
              className="border-line-fina hover:bg-surface-suave flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-0 disabled:opacity-50"
            >
              <Text variant="dado" tone="sutil" className="w-12 text-right">
                {item.codigo}
              </Text>
              <Text variant="corpo" as="span" className="flex-1 font-medium">
                {item.nome}
              </Text>
              {item.meio ? <Text variant="legenda">{ROTULO_DO_MEIO[item.meio]}</Text> : null}
              {!item.ativo ? <Text variant="legenda">inativo</Text> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BuscaDeTabela({
  tipo,
  somenteAtivos,
  aoEscolher,
  aoFechar,
  aoCadastrar,
}: {
  readonly tipo: TipoDeTabela;
  readonly somenteAtivos: boolean;
  readonly aoEscolher: (item: ItemDeTabela) => void;
  readonly aoFechar: () => void;
  readonly aoCadastrar?: () => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [termo, setTermo] = useState('');
  useEffect(() => campo.current?.focus(), []);
  const [itens, setItens] = useState<readonly ItemDeTabela[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const relogio = window.setTimeout(() => {
      listarTabela(tipo, { termo, somenteAtivos })
        .then((lista) => ativo && setItens(lista))
        .catch(
          (falha: unknown) =>
            ativo && setErro(falha instanceof Error ? falha.message : 'Falha ao carregar'),
        );
    }, 200);
    return () => {
      ativo = false;
      window.clearTimeout(relogio);
    };
  }, [tipo, termo, somenteAtivos]);

  return (
    <Modal onClose={aoFechar} title={ROTULO_DA_TABELA[tipo]} size="md">
      <Input
        ref={campo}
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
        placeholder="Código ou nome"
        aria-label="Procurar na tabela"
      />
      <ListaDeItens itens={itens} erro={erro} aoEscolher={aoEscolher} />

      {aoCadastrar ? (
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" onClick={aoCadastrar}>
            <FilePlus2 size={16} aria-hidden="true" /> Cadastrar novo
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}

export function NovoItemDeTabela({
  tipo,
  aoCriar,
  aoFechar,
}: {
  readonly tipo: TipoDeTabela;
  readonly aoCriar: (item: ItemDeTabela) => void;
  readonly aoFechar: () => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState('');
  useEffect(() => campo.current?.focus(), []);
  const [meio, setMeio] = useState<MeioDePagamento>('OUTROS');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    if (!nome.trim()) {
      setErro('Informe o nome');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      aoCriar(
        await criarItemDeTabela(tipo, {
          nome,
          ativo: true,
          ...(tipo === 'formas-de-pagamento' ? { meio } : {}),
        }),
      );
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível cadastrar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal onClose={aoFechar} title={`Novo item: ${ROTULO_DA_TABELA[tipo]}`} size="sm">
      <Field label="Nome" error={erro}>
        <Input
          ref={campo}
          value={nome}
          maxLength={60}
          onChange={(evento) => setNome(evento.target.value.toLocaleUpperCase('pt-BR'))}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') void salvar();
          }}
        />
      </Field>
      {tipo === 'formas-de-pagamento' ? (
        <Field label="Como funciona no caixa" className="mt-3">
          <Select
            value={meio}
            onChange={(evento) => setMeio(evento.target.value as MeioDePagamento)}
          >
            {MEIOS_DE_PAGAMENTO.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULO_DO_MEIO[opcao]}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="quiet" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button variant="primary" loading={salvando} onClick={() => void salvar()}>
          {salvando ? 'Salvando…' : 'Cadastrar'}
        </Button>
      </div>
    </Modal>
  );
}

/* eslint-disable max-lines-per-function */
import type { ItemDeTabela, MeioDePagamento, TipoDeTabela } from '@synapse/types';
import { MEIOS_DE_PAGAMENTO, ROTULO_DA_TABELA, ROTULO_DO_MEIO } from '@synapse/types';
import { Modal } from '@synapse/ui';
import { FilePlus2, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { criarItemDeTabela, listarTabela } from './cadastros.api';
import { BOTAO_CLARO, BOTAO_ESCURO, INPUT_DE_BUSCA } from './estilos';

/** A lista da lupa e o cadastro rápido de item de tabela auxiliar. */

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
      <input
        ref={campo}
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
        placeholder="Código ou nome"
        aria-label="Procurar na tabela"
        className={INPUT_DE_BUSCA}
      />
      <div className="border-hairline-light mt-3 max-h-[50vh] overflow-y-auto rounded-xl border">
        {erro ? <p className="text-body-sm p-4 text-[#b3242f]">{erro}</p> : null}
        {!erro && itens === null ? (
          <p className="text-body-sm text-stone flex items-center gap-2 p-4">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
          </p>
        ) : null}
        {itens?.length === 0 ? (
          <p className="text-body-sm text-stone p-4">Nada encontrado.</p>
        ) : null}
        <ul>
          {itens?.map((item) => (
            <li key={item.codigo}>
              <button
                type="button"
                onClick={() => aoEscolher(item)}
                disabled={!item.ativo}
                className="border-hairline-light hover:bg-surface-soft text-body-sm flex w-full items-center gap-3 border-b px-4 py-2.5 text-left last:border-0 disabled:opacity-50"
              >
                <span className="text-stone w-12 text-right tabular-nums">{item.codigo}</span>
                <span className="text-ink flex-1 font-medium">{item.nome}</span>
                {item.meio ? (
                  <span className="text-caption text-stone">{ROTULO_DO_MEIO[item.meio]}</span>
                ) : null}
                {!item.ativo ? <span className="text-caption text-stone">inativo</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {aoCadastrar ? (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={aoCadastrar} className={BOTAO_CLARO}>
            <FilePlus2 size={15} aria-hidden="true" /> Cadastrar novo
          </button>
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
      <label
        className="text-caption text-charcoal mb-1.5 block font-medium"
        htmlFor="novo-item-nome"
      >
        Nome
      </label>
      <input
        id="novo-item-nome"
        ref={campo}
        value={nome}
        maxLength={60}
        onChange={(evento) => setNome(evento.target.value.toLocaleUpperCase('pt-BR'))}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') void salvar();
        }}
        className={INPUT_DE_BUSCA}
      />
      {tipo === 'formas-de-pagamento' ? (
        <>
          <label
            className="text-caption text-charcoal mb-1.5 mt-3 block font-medium"
            htmlFor="novo-item-meio"
          >
            Como funciona no caixa
          </label>
          <select
            id="novo-item-meio"
            value={meio}
            onChange={(evento) => setMeio(evento.target.value as MeioDePagamento)}
            className={INPUT_DE_BUSCA}
          >
            {MEIOS_DE_PAGAMENTO.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULO_DO_MEIO[opcao]}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {erro ? <p className="text-caption mt-2 text-[#b3242f]">{erro}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          className={BOTAO_ESCURO}
        >
          {salvando ? 'Salvando…' : 'Cadastrar'}
        </button>
      </div>
    </Modal>
  );
}

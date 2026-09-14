/* eslint-disable max-lines-per-function */
import type { ItemDeTabela, ReferenciaDeTabela, TipoDeTabela } from '@synapse/types';
import { CircleAlert, FilePlus2, Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { BuscaDeTabela, NovoItemDeTabela } from './BuscaDeTabela';
import { buscarItemDeTabela } from './cadastros.api';
import { BOTAO_ICONE } from './estilos';

/** O campo com lupa do Syndata: "1 - GERAL". Digita o código e sai do campo
 *  para achar o item; a lupa abre a lista; a folha em branco cadastra um item
 *  novo sem sair da ficha. */

const CONTROLE =
  'border-hairline-light text-body-sm text-ink focus:border-primary focus:ring-primary/15 h-11 rounded-xl border bg-[#fcfcfd] px-3 outline-none transition focus:bg-white focus:ring-4';

export function CampoDeTabela({
  tipo,
  rotulo,
  valor,
  aoMudar,
  erro,
  largura = 2,
  somenteAtivos = true,
}: {
  readonly tipo: TipoDeTabela;
  readonly rotulo: string;
  readonly valor: ReferenciaDeTabela;
  readonly aoMudar: (valor: ReferenciaDeTabela) => void;
  readonly erro?: string | undefined;
  readonly largura?: 1 | 2 | 3 | 4 | 'tudo';
  readonly somenteAtivos?: boolean;
}) {
  const id = useId();
  const [codigo, setCodigo] = useState(String(valor.codigo));
  const [aviso, setAviso] = useState<string | null>(null);
  const [janela, setJanela] = useState<'busca' | 'novo' | null>(null);

  useEffect(() => setCodigo(String(valor.codigo)), [valor.codigo]);

  const procurarCodigo = async () => {
    const numero = Number(codigo);
    if (!Number.isInteger(numero) || numero <= 0) {
      setCodigo(String(valor.codigo));
      return;
    }
    if (numero === valor.codigo) return;
    try {
      const item = await buscarItemDeTabela(tipo, numero);
      if (!item.ativo) throw new Error(`${item.codigo} - ${item.nome} está inativo`);
      setAviso(null);
      aoMudar({ codigo: item.codigo, nome: item.nome });
    } catch (falha: unknown) {
      setAviso(falha instanceof Error ? falha.message : 'Código não encontrado');
      setCodigo(String(valor.codigo));
    }
  };

  const escolher = (item: ItemDeTabela) => {
    setAviso(null);
    setJanela(null);
    aoMudar({ codigo: item.codigo, nome: item.nome });
  };

  const span = {
    1: '',
    2: 'col-span-2',
    3: 'col-span-2 sm:col-span-3',
    4: 'col-span-2 sm:col-span-4',
    tudo: 'col-span-full',
  }[largura];
  const mensagem = erro ?? aviso;

  return (
    <div className={`min-w-0 ${span}`}>
      <label htmlFor={id} className="text-caption text-charcoal mb-1.5 block font-medium">
        {rotulo}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          value={codigo}
          inputMode="numeric"
          aria-invalid={Boolean(mensagem) || undefined}
          onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, '').slice(0, 6))}
          onBlur={() => void procurarCodigo()}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              void procurarCodigo();
            }
            if (evento.key === 'F9' || (evento.key === 'Enter' && evento.ctrlKey))
              setJanela('busca');
          }}
          className={`${CONTROLE} w-20 text-right tabular-nums`}
        />
        <button
          type="button"
          onClick={() => setJanela('busca')}
          aria-label={`Procurar ${rotulo.toLowerCase()}`}
          className={BOTAO_ICONE}
        >
          <Search size={16} aria-hidden="true" />
        </button>
        <span className="border-hairline-light bg-surface-soft text-body-sm text-ink flex h-11 min-w-0 flex-1 items-center truncate rounded-xl border px-3">
          {valor.codigo} - {valor.nome}
        </span>
        <button
          type="button"
          onClick={() => setJanela('novo')}
          aria-label={`Cadastrar ${rotulo.toLowerCase()}`}
          title="Cadastrar novo item"
          className={BOTAO_ICONE}
        >
          <FilePlus2 size={16} aria-hidden="true" />
        </button>
      </div>
      {mensagem ? (
        <p className="text-caption mt-1.5 flex items-start gap-1 text-[#b3242f]">
          <CircleAlert size={13} aria-hidden="true" className="mt-px shrink-0" />
          {mensagem}
        </p>
      ) : null}
      {janela === 'busca' ? (
        <BuscaDeTabela
          tipo={tipo}
          somenteAtivos={somenteAtivos}
          aoEscolher={escolher}
          aoFechar={() => setJanela(null)}
          aoCadastrar={() => setJanela('novo')}
        />
      ) : null}
      {janela === 'novo' ? (
        <NovoItemDeTabela tipo={tipo} aoCriar={escolher} aoFechar={() => setJanela(null)} />
      ) : null}
    </div>
  );
}

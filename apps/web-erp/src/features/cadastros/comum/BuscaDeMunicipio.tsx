import { Modal } from '@synapse/ui';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { listarMunicipios, UFS, type MunicipioIbge } from './cadastros.api';
import { INPUT_DE_BUSCA } from './estilos';

/** A lupa da cidade: municípios da UF no IBGE, por nome ou código. */

export function BuscaDeMunicipio({
  ufInicial,
  aoEscolher,
  aoFechar,
}: {
  readonly ufInicial: string;
  readonly aoEscolher: (municipio: MunicipioIbge) => void;
  readonly aoFechar: () => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => campo.current?.focus(), []);
  const [uf, setUf] = useState(ufInicial);
  const [termo, setTermo] = useState('');
  const [lista, setLista] = useState<readonly MunicipioIbge[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setLista(null);
    const relogio = window.setTimeout(() => {
      listarMunicipios(uf, termo)
        .then((achados) => ativo && (setErro(null), setLista(achados)))
        .catch(
          (falha: unknown) =>
            ativo && setErro(falha instanceof Error ? falha.message : 'IBGE indisponível'),
        );
    }, 250);
    return () => {
      ativo = false;
      window.clearTimeout(relogio);
    };
  }, [uf, termo]);

  return (
    <Modal onClose={aoFechar} title="Cidades (IBGE)" size="md">
      <div className="flex gap-2">
        <select
          value={uf}
          onChange={(evento) => setUf(evento.target.value)}
          aria-label="UF"
          className={`${INPUT_DE_BUSCA} w-24`}
        >
          {UFS.map((sigla) => (
            <option key={sigla} value={sigla}>
              {sigla}
            </option>
          ))}
        </select>
        <input
          ref={campo}
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Nome ou código IBGE"
          aria-label="Procurar cidade"
          className={INPUT_DE_BUSCA}
        />
      </div>
      <div className="border-hairline-light mt-3 max-h-[50vh] overflow-y-auto rounded-xl border">
        {erro ? <p className="text-body-sm p-4 text-[#b3242f]">{erro}</p> : null}
        {!erro && lista === null ? (
          <p className="text-body-sm text-stone flex items-center gap-2 p-4">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
          </p>
        ) : null}
        {lista?.slice(0, 200).map((municipio) => (
          <button
            key={municipio.codigo}
            type="button"
            onClick={() => aoEscolher(municipio)}
            className="border-hairline-light hover:bg-surface-soft text-body-sm flex w-full items-center gap-3 border-b px-4 py-2.5 text-left last:border-0"
          >
            <span className="text-stone w-20 tabular-nums">{municipio.codigo}</span>
            <span className="text-ink flex-1">{municipio.nome}</span>
            <span className="text-caption text-stone">{municipio.uf}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

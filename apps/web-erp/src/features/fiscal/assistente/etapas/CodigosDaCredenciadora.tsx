import type { NfceAcquirer } from '@synapse/types';
import { Plus, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { BANDEIRAS } from '../assistente.dados';
import { BOTAO_ICONE, BOTAO_SECUNDARIO, Campo, Escolha, Grupo, Selecao } from '../campos';

type Modo = 'ESTABELECIMENTO' | 'BANDEIRA';

function Etiqueta({
  texto,
  aoRemover,
}: {
  readonly texto: string;
  readonly aoRemover: () => void;
}) {
  return (
    <li className="bg-surface-soft text-body-sm text-ink flex items-center gap-1 rounded-full py-1 pl-3.5 pr-1">
      {texto}
      <button
        type="button"
        aria-label={`Remover ${texto}`}
        onClick={aoRemover}
        className={`${BOTAO_ICONE} h-7 w-7`}
      >
        <X size={14} />
      </button>
    </li>
  );
}

export function CodigosDaCredenciadora({
  credenciadora,
  aoMudar,
}: {
  readonly credenciadora: NfceAcquirer;
  readonly aoMudar: (parcial: Partial<NfceAcquirer>) => void;
}) {
  const [modo, setModo] = useState<Modo>('ESTABELECIMENTO');
  const [codigo, setCodigo] = useState('');
  const [bandeira, setBandeira] = useState<string>(BANDEIRAS[0]);

  const adicionar = (evento: FormEvent) => {
    evento.preventDefault();
    const limpo = codigo.trim();
    if (!limpo) return;
    if (modo === 'ESTABELECIMENTO') {
      if (!credenciadora.establishmentCodes.includes(limpo))
        aoMudar({ establishmentCodes: [...credenciadora.establishmentCodes, limpo] });
    } else {
      const outras = credenciadora.brandCodes.filter((item) => item.brand !== bandeira);
      aoMudar({ brandCodes: [...outras, { brand: bandeira, code: limpo }] });
    }
    setCodigo('');
  };

  return (
    <Grupo titulo={`Códigos — ${credenciadora.tradeName || credenciadora.legalName}`}>
      <Escolha
        rotulo="Informar código"
        valor={modo}
        opcoes={[
          { valor: 'ESTABELECIMENTO', rotulo: 'Por estabelecimento' },
          { valor: 'BANDEIRA', rotulo: 'Por bandeira' },
        ]}
        aoMudar={setModo}
      />
      <form onSubmit={adicionar} className="mt-5 flex max-w-2xl flex-wrap items-end gap-3">
        {modo === 'BANDEIRA' && (
          <Selecao
            rotulo="Bandeira"
            className="w-48"
            valor={bandeira}
            opcoes={BANDEIRAS.map((nome) => ({ valor: nome as string, rotulo: nome }))}
            aoMudar={setBandeira}
          />
        )}
        <Campo
          rotulo={modo === 'ESTABELECIMENTO' ? 'Código do estabelecimento' : 'Código na bandeira'}
          className="min-w-[200px] flex-1"
          value={codigo}
          maxLength={30}
          onChange={(e) => setCodigo(e.target.value)}
        />
        <button type="submit" className={BOTAO_SECUNDARIO} disabled={!codigo.trim()}>
          <Plus size={16} aria-hidden="true" /> Adicionar
        </button>
      </form>
      <ul className="mt-4 flex flex-wrap gap-2">
        {modo === 'ESTABELECIMENTO'
          ? credenciadora.establishmentCodes.map((item) => (
              <Etiqueta
                key={item}
                texto={item}
                aoRemover={() =>
                  aoMudar({
                    establishmentCodes: credenciadora.establishmentCodes.filter(
                      (outro) => outro !== item,
                    ),
                  })
                }
              />
            ))
          : credenciadora.brandCodes.map((item) => (
              <Etiqueta
                key={item.brand}
                texto={`${item.brand}: ${item.code}`}
                aoRemover={() =>
                  aoMudar({
                    brandCodes: credenciadora.brandCodes.filter(
                      (outro) => outro.brand !== item.brand,
                    ),
                  })
                }
              />
            ))}
      </ul>
    </Grupo>
  );
}

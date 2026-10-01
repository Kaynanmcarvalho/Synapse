import { Button, Field, IconButton, Input, Select, TAMANHO_DE_ICONE, Text } from '@synapse/sdl';
import type { NfceAcquirer } from '@synapse/types';
import { Plus, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Secao } from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { BANDEIRAS } from '../assistente.dados';
import { Escolha } from '../campos';
import { incluirCodigo, type ModoDeCodigo } from './codigos';

/** Códigos de uma credenciadora (Fase 8): três responsabilidades separadas —
 *  a regra de inclusão (pura), o formulário de um código e a lista. */

type Modo = ModoDeCodigo;
type Mudar = (parcial: Partial<NfceAcquirer>) => void;

function FormularioDeCodigo({
  credenciadora,
  modo,
  aoMudar,
}: {
  readonly credenciadora: NfceAcquirer;
  readonly modo: Modo;
  readonly aoMudar: Mudar;
}) {
  const [codigo, setCodigo] = useState('');
  const [bandeira, setBandeira] = useState<string>(BANDEIRAS[0]);
  const adicionar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!codigo.trim()) return;
    const mudanca = incluirCodigo(credenciadora, modo, codigo, bandeira);
    if (mudanca) aoMudar(mudanca);
    setCodigo('');
  };
  return (
    <form onSubmit={adicionar} className="mt-4 flex flex-wrap items-end gap-3">
      {modo === 'BANDEIRA' && (
        <Field label="Bandeira" className={L.curto}>
          <Select value={bandeira} onChange={(e) => setBandeira(e.target.value)}>
            {BANDEIRAS.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field
        label={modo === 'ESTABELECIMENTO' ? 'Código do estabelecimento' : 'Código na bandeira'}
        className={L.medio}
      >
        <Input
          className="font-data"
          value={codigo}
          maxLength={30}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </Field>
      <Button type="submit" variant="secondary" disabled={!codigo.trim()}>
        <Plus size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" /> Adicionar
      </Button>
    </form>
  );
}

function Codigo({ texto, aoRemover }: { readonly texto: string; readonly aoRemover: () => void }) {
  return (
    <li className="border-line-fina bg-surface-afundada rounded-controle flex items-center gap-1 border py-0.5 pl-2.5 pr-0.5">
      <Text variant="dado">{texto}</Text>
      <IconButton label={`Remover ${texto}`} density="compacta" onClick={aoRemover}>
        <X size={TAMANHO_DE_ICONE.compacta} aria-hidden="true" />
      </IconButton>
    </li>
  );
}

function ListaDeCodigos({
  credenciadora,
  modo,
  aoMudar,
}: {
  readonly credenciadora: NfceAcquirer;
  readonly modo: Modo;
  readonly aoMudar: Mudar;
}) {
  const { establishmentCodes, brandCodes } = credenciadora;
  const vazia =
    modo === 'ESTABELECIMENTO' ? establishmentCodes.length === 0 : brandCodes.length === 0;
  if (vazia)
    return (
      <Text variant="corpoSecundario" className="mt-3">
        Nenhum código informado.
      </Text>
    );
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Códigos informados">
      {modo === 'ESTABELECIMENTO'
        ? establishmentCodes.map((item) => (
            <Codigo
              key={item}
              texto={item}
              aoRemover={() =>
                aoMudar({
                  establishmentCodes: establishmentCodes.filter((outro) => outro !== item),
                })
              }
            />
          ))
        : brandCodes.map((item) => (
            <Codigo
              key={item.brand}
              texto={`${item.brand}: ${item.code}`}
              aoRemover={() =>
                aoMudar({ brandCodes: brandCodes.filter((outro) => outro.brand !== item.brand) })
              }
            />
          ))}
    </ul>
  );
}

export function CodigosDaCredenciadora({
  credenciadora,
  aoMudar,
}: {
  readonly credenciadora: NfceAcquirer;
  readonly aoMudar: Mudar;
}) {
  const [modo, setModo] = useState<Modo>('ESTABELECIMENTO');
  return (
    <Secao titulo={`Códigos — ${credenciadora.tradeName || credenciadora.legalName}`}>
      <Escolha
        rotulo="Informar código"
        valor={modo}
        opcoes={[
          { valor: 'ESTABELECIMENTO', rotulo: 'Por estabelecimento' },
          { valor: 'BANDEIRA', rotulo: 'Por bandeira' },
        ]}
        aoMudar={setModo}
      />
      <FormularioDeCodigo credenciadora={credenciadora} modo={modo} aoMudar={aoMudar} />
      <ListaDeCodigos credenciadora={credenciadora} modo={modo} aoMudar={aoMudar} />
    </Secao>
  );
}

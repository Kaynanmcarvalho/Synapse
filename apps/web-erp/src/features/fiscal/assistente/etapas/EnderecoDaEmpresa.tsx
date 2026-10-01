import {
  DocInput,
  Field,
  IconButton,
  Input,
  Select,
  Spinner,
  TAMANHO_DE_ICONE,
} from '@synapse/sdl';
import { Search } from 'lucide-react';
import { useState } from 'react';
import {
  LinhaDeCampos,
  Secao,
  ValoresDeLeitura,
} from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { buscarCep } from '../assistente.api';
import { UFS } from '../assistente.dados';
import { formatarCep, formatarCodigoIbge, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { alterarEndereco } from './grade';

type Props = Pick<PropsDeEtapa, 'formulario' | 'alterar' | 'erroDoCampo'>;

/** CEP com lupa: preenche logradouro, bairro, cidade, código IBGE e UF pelo
 *  ViaCEP, sem apagar número e complemento. A lupa é ação do campo (ícone ao
 *  lado), não um botão grande. */
function CampoCep({ formulario, alterar, erroDoCampo }: Props) {
  const [buscando, setBuscando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const { zipCode } = formulario.issuer.address;

  const buscar = async () => {
    setMensagem(null);
    setBuscando(true);
    try {
      const achado = await buscarCep(zipCode);
      if (!achado) {
        setMensagem('CEP não encontrado. Confira os 8 dígitos ou preencha o endereço.');
        return;
      }
      alterar((atual) => ({
        ...atual,
        state: achado.state || atual.state,
        issuer: {
          ...atual.issuer,
          address: {
            ...atual.issuer.address,
            street: achado.street || atual.issuer.address.street,
            district: achado.district || atual.issuer.address.district,
            cityName: achado.cityName,
            cityCode: achado.cityCode,
          },
        },
      }));
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível consultar o CEP.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Field
      label="CEP"
      className="w-48"
      data-campo="issuer.address.zipCode"
      error={mensagem ?? erroDoCampo('issuer.address.zipCode')}
    >
      <div className="flex items-center gap-1">
        <DocInput
          value={formatarCep(zipCode)}
          onChange={(e) =>
            alterarEndereco(alterar)({ zipCode: soDigitos(e.target.value).slice(0, 8) })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && zipCode.length === 8) void buscar();
          }}
        />
        <IconButton
          label="Buscar endereço pelo CEP"
          title="Buscar endereço pelo CEP"
          onClick={() => void buscar()}
          disabled={buscando || zipCode.length !== 8}
        >
          {buscando ? (
            <Spinner size={TAMANHO_DE_ICONE.padrao} decorative />
          ) : (
            <Search size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" />
          )}
        </IconButton>
      </div>
    </Field>
  );
}

function Municipio({ formulario, alterar, erroDoCampo }: Props) {
  const { address } = formulario.issuer;
  const endereco = alterarEndereco(alterar);
  return (
    <>
      <Field
        label="Código IBGE da cidade"
        className={L.curto}
        data-campo="issuer.address.cityCode"
        error={erroDoCampo('issuer.address.cityCode')}
      >
        <DocInput
          value={formatarCodigoIbge(address.cityCode)}
          onChange={(e) => endereco({ cityCode: soDigitos(e.target.value).slice(0, 7) })}
        />
      </Field>
      <Field label="Cidade" className={L.medio}>
        <Input
          value={address.cityName}
          maxLength={60}
          onChange={(e) => endereco({ cityName: e.target.value })}
        />
      </Field>
      <Field label="UF" className={L.codigo} data-campo="state" error={erroDoCampo('state')}>
        <Select
          value={formulario.state}
          onChange={(e) => alterar((atual) => ({ ...atual, state: e.target.value }))}
        >
          <option value="">Selecione</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

export function EnderecoDaEmpresa(props: Props) {
  const { address } = props.formulario.issuer;
  const endereco = alterarEndereco(props.alterar);
  return (
    <Secao titulo="Endereço">
      <LinhaDeCampos>
        <CampoCep {...props} />
        <Field label="Endereço" className={L.resto}>
          <Input
            value={address.street}
            maxLength={120}
            onChange={(e) => endereco({ street: e.target.value })}
          />
        </Field>
        <Field label="Número" className={L.codigo}>
          <Input
            value={address.number}
            maxLength={20}
            placeholder="S/N"
            onChange={(e) => endereco({ number: e.target.value })}
          />
        </Field>
        <Field label="Complemento" className={L.medio}>
          <Input
            value={address.complement}
            maxLength={60}
            onChange={(e) => endereco({ complement: e.target.value })}
          />
        </Field>
      </LinhaDeCampos>
      <div className="mt-3">
        <LinhaDeCampos>
          <Field label="Bairro" className={L.medio}>
            <Input
              value={address.district}
              maxLength={60}
              onChange={(e) => endereco({ district: e.target.value })}
            />
          </Field>
          <Municipio {...props} />
        </LinhaDeCampos>
      </div>
      {/* País não se edita: era um select desabilitado com uma opção só. */}
      <div className="mt-4">
        <ValoresDeLeitura itens={[{ rotulo: 'País', valor: '1058 - Brasil', dado: true }]} />
      </div>
    </Secao>
  );
}

import { LoaderCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { buscarCep } from '../assistente.api';
import { UFS } from '../assistente.dados';
import { formatarCep, formatarCodigoIbge, soDigitos } from '../assistente.formato';
import type { AlterarFormulario, FormularioFiscal } from '../assistente.tipos';
import { BOTAO_ICONE, Campo, Grupo, Selecao } from '../campos';
import { alterarEndereco, GRADE } from './grade';

type Props = { readonly formulario: FormularioFiscal; readonly alterar: AlterarFormulario };

const OPCOES_DE_UF = [
  { valor: '', rotulo: 'Selecione' },
  ...UFS.map((uf) => ({ valor: uf as string, rotulo: uf })),
];

/** CEP com lupa: preenche logradouro, bairro, cidade, codigo IBGE e UF pelo ViaCEP,
 *  sem apagar numero e complemento. */
function CampoCep({ formulario, alterar }: Props) {
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
    <Campo
      rotulo="CEP"
      className="sm:col-span-2 lg:col-span-3"
      inputMode="numeric"
      value={formatarCep(zipCode)}
      dica={mensagem ?? undefined}
      onChange={(e) => alterarEndereco(alterar)({ zipCode: soDigitos(e.target.value).slice(0, 8) })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && zipCode.length === 8) void buscar();
      }}
      acessorio={
        <button
          type="button"
          onClick={() => void buscar()}
          disabled={buscando || zipCode.length !== 8}
          aria-label="Buscar endereço pelo CEP"
          title="Buscar endereço pelo CEP"
          className={BOTAO_ICONE}
        >
          {buscando ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}
        </button>
      }
    />
  );
}

function Municipio({ formulario, alterar }: Props) {
  const { address } = formulario.issuer;
  const endereco = alterarEndereco(alterar);
  return (
    <>
      <Selecao
        rotulo="País"
        className="sm:col-span-3 lg:col-span-3"
        valor="1058"
        opcoes={[{ valor: '1058', rotulo: '1058 - Brasil' }]}
        aoMudar={() => undefined}
        disabled
      />
      <Campo
        rotulo="Código IBGE da cidade"
        className="sm:col-span-2 lg:col-span-3"
        inputMode="numeric"
        value={formatarCodigoIbge(address.cityCode)}
        onChange={(e) => endereco({ cityCode: soDigitos(e.target.value).slice(0, 7) })}
      />
      <Campo
        rotulo="Cidade"
        className="sm:col-span-2 lg:col-span-6"
        value={address.cityName}
        maxLength={60}
        onChange={(e) => endereco({ cityName: e.target.value })}
      />
      <Selecao
        rotulo="UF"
        className="sm:col-span-2 lg:col-span-3"
        valor={formulario.state}
        opcoes={OPCOES_DE_UF}
        aoMudar={(state) => alterar((atual) => ({ ...atual, state }))}
      />
    </>
  );
}

export function EnderecoDaEmpresa({ formulario, alterar }: Props) {
  const { address } = formulario.issuer;
  const endereco = alterarEndereco(alterar);
  return (
    <Grupo titulo="Endereço">
      <div className={GRADE}>
        <CampoCep formulario={formulario} alterar={alterar} />
        <Campo
          rotulo="Endereço"
          className="sm:col-span-4 lg:col-span-7"
          value={address.street}
          maxLength={120}
          onChange={(e) => endereco({ street: e.target.value })}
        />
        <Campo
          rotulo="Número"
          className="sm:col-span-2 lg:col-span-2"
          value={address.number}
          maxLength={20}
          placeholder="S/N"
          onChange={(e) => endereco({ number: e.target.value })}
        />
        <Campo
          rotulo="Complemento"
          className="sm:col-span-4 lg:col-span-4"
          value={address.complement}
          maxLength={60}
          onChange={(e) => endereco({ complement: e.target.value })}
        />
        <Campo
          rotulo="Bairro"
          className="sm:col-span-3 lg:col-span-5"
          value={address.district}
          maxLength={60}
          onChange={(e) => endereco({ district: e.target.value })}
        />
        <Municipio formulario={formulario} alterar={alterar} />
      </div>
    </Grupo>
  );
}

/* eslint-disable max-lines-per-function */
import { LoaderCircle, MapPin, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { Bloco, Campo, Grade } from '../../customers/campos';
import { mascararCep } from '../../customers/formato';
import { lerCaminho } from './caminho';
import { BuscaDeMunicipio } from './BuscaDeMunicipio';
import { buscarMunicipio, consultarCep, UFS, type MunicipioIbge } from './cadastros.api';
import { CampoTexto, type LigacaoDaFicha } from './CamposDaFicha';
import { soDigitos } from './mascaras';
import { BOTAO_ICONE } from './estilos';

/** O bloco de endereço das fichas: CEP com lupa (ViaCEP/BrasilAPI pela API),
 *  cidade pelo código IBGE com lupa dos municípios da UF, e o resto digitado.
 *  `prefixo` é onde o endereço mora na ficha ("endereco"). */

const CONTROLE =
  'border-hairline-light text-body-sm text-ink focus:border-primary focus:ring-primary/15 h-11 rounded-xl border bg-[#fcfcfd] px-3 outline-none transition focus:bg-white focus:ring-4';

export function EnderecoDaFicha({
  ficha,
  prefixo,
  comNumero,
  comPais,
}: {
  readonly ficha: LigacaoDaFicha;
  readonly prefixo: string;
  readonly comNumero: boolean;
  readonly comPais: boolean;
}) {
  const caminho = (campo: string) => `${prefixo}.${campo}`;
  const ler = (campo: string) => String(lerCaminho(ficha.formulario, caminho(campo)) ?? '');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lupaDaCidade, setLupaDaCidade] = useState(false);
  const idCidade = useId();
  const estrangeiro = comPais && ler('paisCodigo') !== '' && ler('paisCodigo') !== '1058';

  const preencherPeloCep = async () => {
    const cep = ler('cep').replace(/\D/g, '');
    if (cep.length !== 8) {
      setAviso('Digite os 8 números do CEP');
      return;
    }
    setBuscandoCep(true);
    setAviso(null);
    try {
      const achado = await consultarCep(cep);
      if (achado.logradouro)
        ficha.mudar(caminho('logradouro'), achado.logradouro.toLocaleUpperCase('pt-BR'));
      if (achado.bairro) ficha.mudar(caminho('bairro'), achado.bairro.toLocaleUpperCase('pt-BR'));
      ficha.mudar(caminho('cidade'), achado.cidade.toLocaleUpperCase('pt-BR'));
      ficha.mudar(caminho('uf'), achado.uf);
      ficha.mudar(caminho('cidadeCodigoIbge'), achado.cidadeCodigoIbge ?? '');
    } catch (falha: unknown) {
      setAviso(falha instanceof Error ? falha.message : 'CEP não encontrado');
    } finally {
      setBuscandoCep(false);
    }
  };

  const escolherMunicipio = (municipio: MunicipioIbge) => {
    ficha.mudar(caminho('cidadeCodigoIbge'), municipio.codigo);
    ficha.mudar(caminho('cidade'), municipio.nome.toLocaleUpperCase('pt-BR'));
    ficha.mudar(caminho('uf'), municipio.uf);
    setLupaDaCidade(false);
    setAviso(null);
  };

  const procurarCodigoIbge = async () => {
    const codigo = ler('cidadeCodigoIbge').replace(/\D/g, '');
    if (codigo.length !== 7) return;
    try {
      escolherMunicipio(await buscarMunicipio(codigo));
    } catch (falha: unknown) {
      setAviso(falha instanceof Error ? falha.message : 'Código IBGE não encontrado');
    }
  };

  return (
    <Bloco
      titulo="Endereço"
      icone={MapPin}
      descricao="CEP e cidade pela lupa; o código IBGE vai para a NF-e"
    >
      <Grade colunas={6}>
        <Campo rotulo="CEP" erro={ficha.erros[caminho('cep')] ?? aviso} largura={2}>
          {({ id, invalido }) => (
            <div className="flex gap-2">
              <input
                id={id}
                value={mascararCep(ler('cep'))}
                inputMode="numeric"
                aria-invalid={invalido || undefined}
                onChange={(evento) =>
                  ficha.mudar(caminho('cep'), evento.target.value.replace(/\D/g, '').slice(0, 8))
                }
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    evento.preventDefault();
                    void preencherPeloCep();
                  }
                }}
                disabled={estrangeiro}
                className={`${CONTROLE} min-w-0 flex-1 tabular-nums`}
              />
              <button
                type="button"
                onClick={() => void preencherPeloCep()}
                disabled={buscandoCep || estrangeiro}
                aria-label="Procurar CEP"
                className={BOTAO_ICONE}
              >
                {buscandoCep ? (
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Search size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </Campo>
        {comPais ? (
          <>
            <CampoTexto
              ficha={ficha}
              caminho={caminho('paisCodigo')}
              rotulo="País (código)"
              mascara={soDigitos(4)}
              inputMode="numeric"
            />
            <CampoTexto
              ficha={ficha}
              caminho={caminho('paisNome')}
              rotulo="País"
              maiusculas
              largura={3}
            />
          </>
        ) : null}
        <CampoTexto
          ficha={ficha}
          caminho={caminho('logradouro')}
          rotulo="Endereço"
          maiusculas
          largura={comNumero ? 4 : 'tudo'}
          maxLength={200}
        />
        {comNumero ? (
          <>
            <CampoTexto
              ficha={ficha}
              caminho={caminho('numero')}
              rotulo="Nº"
              maxLength={20}
              maiusculas
            />
            <CampoTexto
              ficha={ficha}
              caminho={caminho('complemento')}
              rotulo="Complemento"
              maxLength={120}
              maiusculas
            />
          </>
        ) : null}
        <CampoTexto
          ficha={ficha}
          caminho={caminho('bairro')}
          rotulo="Bairro"
          maiusculas
          largura={2}
          maxLength={120}
        />
        <div className="col-span-2 min-w-0 sm:col-span-4">
          <label htmlFor={idCidade} className="text-caption text-charcoal mb-1.5 block font-medium">
            Cidade
          </label>
          <div className="flex gap-2">
            <input
              id={idCidade}
              value={ler('cidadeCodigoIbge')}
              placeholder="IBGE"
              inputMode="numeric"
              aria-label="Código IBGE da cidade"
              onChange={(evento) =>
                ficha.mudar(
                  caminho('cidadeCodigoIbge'),
                  evento.target.value.replace(/\D/g, '').slice(0, 7),
                )
              }
              onBlur={() => void procurarCodigoIbge()}
              className={`${CONTROLE} w-24 tabular-nums`}
            />
            <button
              type="button"
              onClick={() => setLupaDaCidade(true)}
              aria-label="Procurar cidade"
              className={BOTAO_ICONE}
            >
              <Search size={16} aria-hidden="true" />
            </button>
            <input
              value={ler('cidade')}
              aria-label="Nome da cidade"
              onChange={(evento) =>
                ficha.mudar(caminho('cidade'), evento.target.value.toLocaleUpperCase('pt-BR'))
              }
              className={`${CONTROLE} min-w-0 flex-1`}
            />
            <select
              value={ler('uf')}
              aria-label="UF"
              onChange={(evento) => ficha.mudar(caminho('uf'), evento.target.value)}
              className={`${CONTROLE} w-24`}
            >
              <option value="">UF</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          {ficha.erros[caminho('cidadeCodigoIbge')] || ficha.erros[caminho('uf')] ? (
            <p className="text-caption mt-1.5 text-[#b3242f]">
              {ficha.erros[caminho('cidadeCodigoIbge')] ?? ficha.erros[caminho('uf')]}
            </p>
          ) : null}
        </div>
      </Grade>
      {lupaDaCidade ? (
        <BuscaDeMunicipio
          ufInicial={ler('uf') || 'GO'}
          aoEscolher={escolherMunicipio}
          aoFechar={() => setLupaDaCidade(false)}
        />
      ) : null}
    </Bloco>
  );
}

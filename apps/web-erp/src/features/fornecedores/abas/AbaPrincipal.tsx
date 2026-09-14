/* eslint-disable max-lines-per-function */
import type { ReferenciaDeTabela, Supplier } from '@synapse/types';
import {
  Building2,
  FileSearch,
  Layers,
  LoaderCircle,
  Phone,
  ReceiptText,
  UserRound,
} from 'lucide-react';
import { Area, Bloco, Campo, Grade, Selecao, Texto } from '../../customers/campos';
import { Telefone } from './Telefone';
import { mascararDocumento, mascararTelefone } from '../../customers/formato';
import { lerCaminho } from '../../cadastros/comum/caminho';
import { CampoDeTabela } from '../../cadastros/comum/CampoDeTabela';
import { CampoSelecao, CampoTexto, type LigacaoDaFicha } from '../../cadastros/comum/CamposDaFicha';
import { EnderecoDaFicha } from '../../cadastros/comum/EnderecoDaFicha';
import { BOTAO_CLARO } from '../../cadastros/comum/estilos';
import { soDigitos } from '../../cadastros/comum/mascaras';

/** Aba Principal do fornecedor: a tela do Syndata em blocos — quem é (com a
 *  consulta do CNPJ no F4), onde fica, como se agrupa, como falar e os dados
 *  fiscais. */

const TIPO = [
  ['JURIDICA', 'Jurídica'],
  ['FISICA', 'Física'],
  ['ESTRANGEIRA', 'Estrangeira'],
] as const;

const REGIME = [
  ['', 'Não informado'],
  ['SIMPLES_NACIONAL', '1 - Simples Nacional'],
  ['SIMPLES_EXCESSO', '2 - Simples Nacional, excesso de sublimite'],
  ['REGIME_NORMAL', '3 - Regime Normal'],
  ['MEI', '4 - MEI'],
] as const;

const INDICADOR = [
  ['CONTRIBUINTE', '1 - Contribuinte de ICMS'],
  ['ISENTO', '2 - Contribuinte isento'],
  ['NAO_CONTRIBUINTE', '9 - Não contribuinte'],
] as const;

export function AbaPrincipal({
  ficha,
  gravado,
  consultando,
  aoConsultarCnpj,
}: {
  readonly ficha: LigacaoDaFicha;
  readonly gravado: Supplier | null;
  readonly consultando: boolean;
  readonly aoConsultarCnpj: () => void;
}) {
  const tipo = String(lerCaminho(ficha.formulario, 'tipoDePessoa'));
  const referencia = (caminho: string) =>
    lerCaminho(ficha.formulario, caminho) as ReferenciaDeTabela;
  return (
    <div className="grid gap-4">
      <Bloco
        titulo="Identificação"
        icone={Building2}
        descricao="CNPJ ou CPF único por empresa"
        acao={
          tipo === 'JURIDICA' ? (
            <button
              type="button"
              onClick={aoConsultarCnpj}
              disabled={consultando}
              className={BOTAO_CLARO}
            >
              {consultando ? (
                <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <FileSearch size={15} aria-hidden="true" />
              )}
              (F4) Consultar CNPJ
            </button>
          ) : null
        }
      >
        <Grade colunas={6}>
          <Campo rotulo="Código" dica={gravado ? 'Gerado pelo sistema' : 'Gerado ao salvar'}>
            {({ id }) => (
              <Texto
                id={id}
                valor={gravado?.codigo ? String(gravado.codigo) : 'Novo'}
                aoMudar={() => undefined}
                disabled
              />
            )}
          </Campo>
          <Campo rotulo="Situação">
            {({ id }) => (
              <Selecao
                id={id}
                valor={lerCaminho(ficha.formulario, 'ativo') === false ? 'inativo' : 'ativo'}
                aoMudar={(valor) => ficha.mudar('ativo', valor === 'ativo')}
                opcoes={
                  [
                    ['ativo', 'Ativo'],
                    ['inativo', 'Inativo'],
                  ] as const
                }
              />
            )}
          </Campo>
          <CampoSelecao ficha={ficha} caminho="tipoDePessoa" rotulo="Pessoa" opcoes={TIPO} />
          {tipo === 'ESTRANGEIRA' ? (
            <CampoTexto
              ficha={ficha}
              caminho="documento"
              rotulo="Identificação estrangeira"
              largura={3}
              maxLength={20}
            />
          ) : (
            <CampoTexto
              ficha={ficha}
              caminho="documento"
              rotulo={tipo === 'FISICA' ? 'CPF' : 'CNPJ'}
              mascara={mascararDocumento}
              inputMode="numeric"
              largura={3}
            />
          )}
          <CampoTexto
            ficha={ficha}
            caminho="razaoSocial"
            rotulo={tipo === 'FISICA' ? 'Nome completo' : 'Razão Social'}
            largura={3}
            maiusculas
            maxLength={160}
          />
          <CampoTexto
            ficha={ficha}
            caminho="nomeFantasia"
            rotulo="Nome Fantasia"
            largura={3}
            maiusculas
            maxLength={160}
          />
        </Grade>
      </Bloco>

      <EnderecoDaFicha ficha={ficha} prefixo="endereco" comNumero comPais />

      <div className="grid gap-4 xl:grid-cols-2">
        <Bloco
          titulo="Classificação"
          icone={Layers}
          descricao="Praça, grupo, regime tributário e prazo de entrega"
        >
          <Grade colunas={4}>
            <CampoDeTabela
              tipo="pracas"
              rotulo="Praça / Região"
              valor={referencia('praca')}
              aoMudar={(valor) => ficha.mudar('praca', valor)}
              erro={ficha.erros['praca']}
              largura="tudo"
            />
            <CampoDeTabela
              tipo="grupos-de-fornecedor"
              rotulo="Grupo"
              valor={referencia('grupo')}
              aoMudar={(valor) => ficha.mudar('grupo', valor)}
              erro={ficha.erros['grupo']}
              largura="tudo"
            />
            <CampoDeTabela
              tipo="subgrupos-de-fornecedor"
              rotulo="Sub-Grupo"
              valor={referencia('subGrupo')}
              aoMudar={(valor) => ficha.mudar('subGrupo', valor)}
              erro={ficha.erros['subGrupo']}
              largura="tudo"
            />
            <CampoSelecao
              ficha={ficha}
              caminho="regimeTributario"
              rotulo="Reg. Trib. (CRT)"
              opcoes={REGIME}
              largura={3}
            />
            <CampoTexto
              ficha={ficha}
              caminho="prazoMedioDeEntregaDias"
              rotulo="Prazo de entrega (dias)"
              mascara={soDigitos(3)}
              inputMode="numeric"
            />
          </Grade>
        </Bloco>

        <Bloco titulo="Contato" icone={Phone}>
          <Grade colunas={4}>
            <Telefone ficha={ficha} caminho="telefone1" rotulo="Telefone (1)" />
            <Telefone ficha={ficha} caminho="telefone2" rotulo="Telefone (2)" />
            <CampoTexto
              ficha={ficha}
              caminho="fax"
              rotulo="FAX"
              mascara={mascararTelefone}
              inputMode="tel"
              largura={2}
            />
            <CampoTexto ficha={ficha} caminho="site" rotulo="Site" largura={2} maxLength={200} />
            <CampoTexto
              ficha={ficha}
              caminho="email"
              rotulo="E-mail"
              type="email"
              largura={2}
              maxLength={200}
            />
            <CampoTexto
              ficha={ficha}
              caminho="emailNfe"
              rotulo="E-mail NF-e"
              type="email"
              largura={2}
              maxLength={200}
              dica="Para onde vai o XML das devoluções"
            />
          </Grade>
        </Bloco>

        <Bloco titulo="Fiscal" icone={ReceiptText}>
          <Grade colunas={4}>
            <CampoTexto
              ficha={ficha}
              caminho="inscricaoEstadual"
              rotulo="Insc. Est. (IE)"
              largura={2}
              maxLength={16}
              dica='Números ou "ISENTO"'
            />
            <CampoSelecao
              ficha={ficha}
              caminho="indicadorIe"
              rotulo="Indicador IE"
              opcoes={INDICADOR}
              largura={2}
            />
            <CampoTexto
              ficha={ficha}
              caminho="inscricaoMunicipal"
              rotulo="Insc. Municipal"
              largura={2}
              maxLength={20}
            />
          </Grade>
        </Bloco>

        <Bloco titulo="Representante" icone={UserRound}>
          <Grade colunas={4}>
            <CampoTexto
              ficha={ficha}
              caminho="representante.nome"
              rotulo="Representante"
              largura="tudo"
              maiusculas
              maxLength={120}
            />
            <CampoTexto
              ficha={ficha}
              caminho="representante.telefone"
              rotulo="Telefone"
              mascara={mascararTelefone}
              inputMode="tel"
              largura={2}
            />
            <CampoTexto
              ficha={ficha}
              caminho="representante.celular"
              rotulo="Celular"
              mascara={mascararTelefone}
              inputMode="tel"
              largura={2}
            />
          </Grade>
        </Bloco>
      </div>

      <Bloco titulo="Observação">
        <Area
          valor={String(lerCaminho(ficha.formulario, 'observacao') ?? '')}
          aoMudar={(valor) => ficha.mudar('observacao', valor)}
          linhas={5}
          maxLength={2000}
        />
      </Bloco>
    </div>
  );
}

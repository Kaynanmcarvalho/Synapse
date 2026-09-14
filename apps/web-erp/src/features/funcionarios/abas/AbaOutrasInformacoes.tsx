/* eslint-disable max-lines-per-function */
import { FileText, UserRound } from 'lucide-react';
import { Area, Bloco, Campo, Grade } from '../../customers/campos';
import { mascararDocumento } from '../../customers/formato';
import { lerCaminho } from '../../cadastros/comum/caminho';
import { CampoSelecao, CampoTexto, type LigacaoDaFicha } from '../../cadastros/comum/CamposDaFicha';
import { soDigitos } from '../../cadastros/comum/mascaras';

/** Aba Outras Informações: dados pessoais à esquerda e documentos à direita,
 *  como na tela do Syndata. */

const SEXO = [
  ['NAO_INFORMADO', 'Não informado'],
  ['MASCULINO', 'Masculino'],
  ['FEMININO', 'Feminino'],
] as const;

const ESTADO_CIVIL = [
  ['NAO_INFORMADO', 'Não informado'],
  ['SOLTEIRO', 'Solteiro(a)'],
  ['CASADO', 'Casado(a)'],
  ['UNIAO_ESTAVEL', 'União estável'],
  ['SEPARADO', 'Separado(a)'],
  ['DIVORCIADO', 'Divorciado(a)'],
  ['VIUVO', 'Viúvo(a)'],
] as const;

const ESCOLARIDADE = [
  'Ensino fundamental incompleto',
  'Ensino fundamental completo',
  'Ensino médio incompleto',
  'Ensino médio completo',
  'Técnico',
  'Superior incompleto',
  'Superior completo',
  'Pós-graduação',
];

export function AbaOutrasInformacoes({ ficha }: { readonly ficha: LigacaoDaFicha }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Bloco titulo="Pessoais" icone={UserRound}>
        <Grade colunas={4}>
          <CampoTexto
            ficha={ficha}
            caminho="outrasInformacoes.nascimento"
            rotulo="Data Nascimento"
            type="date"
          />
          <CampoSelecao
            ficha={ficha}
            caminho="outrasInformacoes.sexo"
            rotulo="Sexo"
            opcoes={SEXO}
          />
          <CampoTexto
            ficha={ficha}
            caminho="outrasInformacoes.tipoSanguineo"
            rotulo="Tipo Sanguíneo"
            maxLength={3}
            maiusculas
            placeholder="O+"
          />
          <Campo rotulo="Escolaridade" erro={ficha.erros['outrasInformacoes.escolaridade']}>
            {({ id }) => (
              <>
                <input
                  id={id}
                  list="escolaridades"
                  value={String(
                    lerCaminho(ficha.formulario, 'outrasInformacoes.escolaridade') ?? '',
                  )}
                  onChange={(evento) =>
                    ficha.mudar('outrasInformacoes.escolaridade', evento.target.value)
                  }
                  maxLength={80}
                  className="border-hairline-light text-body-sm text-ink focus:border-primary focus:ring-primary/15 h-11 w-full rounded-xl border bg-[#fcfcfd] px-3.5 outline-none transition focus:bg-white focus:ring-4"
                />
                <datalist id="escolaridades">
                  {ESCOLARIDADE.map((opcao) => (
                    <option key={opcao} value={opcao} />
                  ))}
                </datalist>
              </>
            )}
          </Campo>
          <CampoTexto
            ficha={ficha}
            caminho="outrasInformacoes.email"
            rotulo="E-mail"
            type="email"
            largura="tudo"
            maxLength={200}
          />
          <CampoTexto
            ficha={ficha}
            caminho="outrasInformacoes.pai"
            rotulo="Pai"
            largura={2}
            maiusculas
            maxLength={120}
          />
          <CampoTexto
            ficha={ficha}
            caminho="outrasInformacoes.mae"
            rotulo="Mãe"
            largura={2}
            maiusculas
            maxLength={120}
          />
          <CampoSelecao
            ficha={ficha}
            caminho="outrasInformacoes.estadoCivil"
            rotulo="Estado Civil"
            opcoes={ESTADO_CIVIL}
          />
          <CampoTexto
            ficha={ficha}
            caminho="outrasInformacoes.conjuge"
            rotulo="Cônjuge"
            largura={3}
            maiusculas
            maxLength={120}
          />
          <Campo
            rotulo="Observações"
            largura="tudo"
            erro={ficha.erros['outrasInformacoes.observacoes']}
          >
            {({ id }) => (
              <Area
                id={id}
                linhas={6}
                maxLength={4000}
                valor={String(lerCaminho(ficha.formulario, 'outrasInformacoes.observacoes') ?? '')}
                aoMudar={(valor) => ficha.mudar('outrasInformacoes.observacoes', valor)}
              />
            )}
          </Campo>
        </Grade>
      </Bloco>
      <Bloco titulo="Documentos" icone={FileText} descricao="O CPF é único por empresa">
        <Grade colunas={2}>
          <CampoTexto
            ficha={ficha}
            caminho="documentos.identidade"
            rotulo="Identidade"
            maxLength={20}
            largura={2}
          />
          <CampoTexto
            ficha={ficha}
            caminho="documentos.cpf"
            rotulo="CPF"
            mascara={mascararDocumento}
            inputMode="numeric"
            largura={2}
          />
          <CampoTexto
            ficha={ficha}
            caminho="documentos.pis"
            rotulo="PIS"
            mascara={soDigitos(11)}
            inputMode="numeric"
            largura={2}
          />
          <CampoTexto
            ficha={ficha}
            caminho="documentos.tituloDeEleitor"
            rotulo="Título de Eleitor"
            mascara={soDigitos(12)}
            inputMode="numeric"
            largura={2}
          />
          <CampoTexto ficha={ficha} caminho="documentos.ctps" rotulo="CTPS" maxLength={20} />
          <CampoTexto
            ficha={ficha}
            caminho="documentos.serieDaCtps"
            rotulo="Série"
            maxLength={10}
          />
          <CampoTexto
            ficha={ficha}
            caminho="documentos.cnh"
            rotulo="CNH"
            mascara={soDigitos(11)}
            inputMode="numeric"
          />
          <CampoTexto
            ficha={ficha}
            caminho="documentos.categoriaDaCnh"
            rotulo="Categoria"
            maxLength={3}
            maiusculas
          />
        </Grade>
      </Bloco>
    </div>
  );
}

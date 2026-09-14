import { BookOpenText, Landmark } from 'lucide-react';
import { Bloco, Grade } from '../../customers/campos';
import {
  CampoCaixa,
  CampoSelecao,
  CampoTexto,
  type LigacaoDaFicha,
} from '../../cadastros/comum/CamposDaFicha';
import { soDigitos } from '../../cadastros/comum/mascaras';

/** Aba Escrituração Digital: como o fornecedor entra no SPED (participante 0150),
 *  na contabilidade e o que a nota de entrada dele retém. */

const ATIVIDADE = [
  ['INDUSTRIA', 'Indústria'],
  ['ATACADO', 'Comércio atacadista'],
  ['VAREJO', 'Comércio varejista'],
  ['PRODUTOR_RURAL', 'Produtor rural'],
  ['PRESTADOR_DE_SERVICO', 'Prestador de serviço'],
  ['IMPORTADOR', 'Importador'],
  ['OUTROS', 'Outros'],
] as const;

export function AbaEscrituracao({ ficha }: { readonly ficha: LigacaoDaFicha }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bloco
        titulo="SPED e contabilidade"
        icone={BookOpenText}
        descricao="Registro 0150 e integração contábil"
      >
        <Grade colunas={2}>
          <CampoTexto
            ficha={ficha}
            caminho="escrituracao.codigoDoParticipante"
            rotulo="Código do participante"
            maxLength={60}
            dica="Vazio usa o código do fornecedor"
          />
          <CampoTexto
            ficha={ficha}
            caminho="escrituracao.contaContabil"
            rotulo="Conta contábil"
            maxLength={40}
          />
          <CampoSelecao
            ficha={ficha}
            caminho="escrituracao.atividade"
            rotulo="Atividade"
            opcoes={ATIVIDADE}
          />
          <CampoTexto
            ficha={ficha}
            caminho="escrituracao.inscricaoSuframa"
            rotulo="Inscrição SUFRAMA"
            mascara={soDigitos(9)}
            inputMode="numeric"
          />
          <CampoTexto
            ficha={ficha}
            caminho="escrituracao.nitPis"
            rotulo="NIT / PIS (autônomo)"
            mascara={soDigitos(11)}
            inputMode="numeric"
          />
        </Grade>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <CampoCaixa
            ficha={ficha}
            caminho="escrituracao.geraCreditoPisCofins"
            rotulo="Gera crédito de PIS/COFINS"
            dica="As entradas deste fornecedor creditam PIS e COFINS"
          />
          <CampoCaixa
            ficha={ficha}
            caminho="escrituracao.retemFunrural"
            rotulo="Retém FUNRURAL"
            dica="Produtor rural pessoa física"
          />
        </div>
      </Bloco>
      <Bloco
        titulo="Retenções na entrada"
        icone={Landmark}
        descricao="Impostos retidos na nota deste fornecedor"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <CampoCaixa ficha={ficha} caminho="escrituracao.retencoes.irrf" rotulo="IRRF" />
          <CampoCaixa ficha={ficha} caminho="escrituracao.retencoes.inss" rotulo="INSS" />
          <CampoCaixa ficha={ficha} caminho="escrituracao.retencoes.pis" rotulo="PIS" />
          <CampoCaixa ficha={ficha} caminho="escrituracao.retencoes.cofins" rotulo="COFINS" />
          <CampoCaixa ficha={ficha} caminho="escrituracao.retencoes.csll" rotulo="CSLL" />
          <CampoCaixa ficha={ficha} caminho="escrituracao.retencoes.iss" rotulo="ISS" />
        </div>
      </Bloco>
    </div>
  );
}

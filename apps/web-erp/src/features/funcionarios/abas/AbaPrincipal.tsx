/* eslint-disable max-lines-per-function */
import type { Funcionario, ReferenciaDeTabela } from '@synapse/types';
import { BriefcaseBusiness, IdCard, Phone } from 'lucide-react';
import { Bloco, Campo, Grade, Texto } from '../../customers/campos';
import { mascararTelefone } from '../../customers/formato';
import { CampoDeTabela } from '../../cadastros/comum/CampoDeTabela';
import { CampoCaixa, CampoTexto, type LigacaoDaFicha } from '../../cadastros/comum/CamposDaFicha';
import { EnderecoDaFicha } from '../../cadastros/comum/EnderecoDaFicha';
import { lerCaminho } from '../../cadastros/comum/caminho';
import { mascararHora, mascararValor } from '../../cadastros/comum/mascaras';
import { FotoDoFuncionario } from '../FotoDoFuncionario';

/** Aba Principal: quem é, onde mora, como falar e o vínculo de trabalho — na
 *  ordem da tela do Syndata, com a foto ao lado. */
export function AbaPrincipal({
  ficha,
  gravado,
}: {
  readonly ficha: LigacaoDaFicha;
  readonly gravado: Funcionario | null;
}) {
  const referencia = (caminho: string) =>
    lerCaminho(ficha.formulario, caminho) as ReferenciaDeTabela;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="grid gap-4">
        <Bloco
          titulo="Identificação"
          icone={IdCard}
          descricao="Código, matrícula e nome que aparecem nas vendas"
        >
          <Grade colunas={4}>
            <Campo rotulo="Código" dica={gravado ? 'Gerado pelo sistema' : 'Gerado ao salvar'}>
              {({ id }) => (
                <Texto
                  id={id}
                  valor={gravado ? String(gravado.codigo) : 'Novo'}
                  aoMudar={() => undefined}
                  disabled
                />
              )}
            </Campo>
            <CampoTexto ficha={ficha} caminho="matricula" rotulo="Matrícula" maxLength={20} />
            <div className="col-span-2 flex items-end">
              <CampoCaixa
                ficha={ficha}
                caminho="bloqueado"
                rotulo="Bloquear"
                dica="Bloqueado não entra como vendedor em venda nova"
              />
            </div>
            <CampoTexto
              ficha={ficha}
              caminho="nome"
              rotulo="Nome *"
              largura="tudo"
              maxLength={120}
              maiusculas
            />
          </Grade>
        </Bloco>

        <EnderecoDaFicha ficha={ficha} prefixo="endereco" comNumero={false} comPais={false} />

        <Bloco titulo="Contato" icone={Phone}>
          <Grade colunas={4}>
            <CampoTexto
              ficha={ficha}
              caminho="telefone"
              rotulo="Telefone"
              mascara={mascararTelefone}
              inputMode="tel"
              largura={2}
            />
            <CampoTexto
              ficha={ficha}
              caminho="celular"
              rotulo="Celular"
              mascara={mascararTelefone}
              inputMode="tel"
              largura={2}
            />
          </Grade>
        </Bloco>

        <Bloco
          titulo="Trabalho"
          icone={BriefcaseBusiness}
          descricao="Cargo, praça, departamento, horário e salário"
        >
          <Grade colunas={4}>
            <CampoDeTabela
              tipo="cargos"
              rotulo="Cargo"
              valor={referencia('cargo')}
              aoMudar={(valor) => ficha.mudar('cargo', valor)}
              erro={ficha.erros['cargo']}
              largura="tudo"
            />
            <CampoDeTabela
              tipo="pracas"
              rotulo="Praça / Região"
              valor={referencia('praca')}
              aoMudar={(valor) => ficha.mudar('praca', valor)}
              erro={ficha.erros['praca']}
              largura="tudo"
            />
            <CampoDeTabela
              tipo="departamentos"
              rotulo="Departamento"
              valor={referencia('departamento')}
              aoMudar={(valor) => ficha.mudar('departamento', valor)}
              erro={ficha.erros['departamento']}
              largura="tudo"
            />
            <CampoTexto
              ficha={ficha}
              caminho="horaDeEntrada"
              rotulo="Hora de Entrada"
              mascara={mascararHora}
              placeholder="08:00:00"
              inputMode="numeric"
            />
            <CampoTexto
              ficha={ficha}
              caminho="horaDeSaida"
              rotulo="Hora de Saída"
              mascara={mascararHora}
              placeholder="18:00:00"
              inputMode="numeric"
            />
            <CampoTexto ficha={ficha} caminho="admissao" rotulo="Admissão *" type="date" />
            <CampoTexto ficha={ficha} caminho="demissao" rotulo="Demissão" type="date" />
            <CampoTexto
              ficha={ficha}
              caminho="salario"
              rotulo="Salário (R$)"
              mascara={mascararValor}
              inputMode="decimal"
            />
          </Grade>
        </Bloco>
      </div>
      <div className="lg:pt-0">
        <FotoDoFuncionario
          funcionarioId={gravado?.id ?? null}
          temFoto={Boolean(gravado?.fotoAtualizadaEm)}
        />
      </div>
    </div>
  );
}

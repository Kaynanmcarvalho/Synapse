import { Field, Input } from '@synapse/sdl';
import { Plus, Trash2 } from 'lucide-react';
import { AreaDeTexto, LinhaDeCampos, Secao } from '../../../components/formulario/Formulario';
import { Caixa } from '../campos';
import { mascararDocumento, mascararTelefone } from '../formato';
import type { PropsDaAba } from './aba';
import { CampoDeTexto } from './CampoDoFormulario';

/** Aba Pessoa Jurídica: quem atende, quem assina e o que o fisco pede de uma
 *  empresa. Some inteira para pessoa física — campo de sócio em cadastro de
 *  pessoa física é campo que ninguém preenche.
 *
 *  Fase 6.2: migrado para `Secao`/`LinhaDeCampos`/`CampoDeTexto`. Nada aqui é
 *  obrigatório no `clienteSchema` — todo o bloco `pessoaJuridica` é opcional.
 *  `Socios` fica com layout próprio (lista de tamanho variável com
 *  adicionar/remover): a Form Grammar não tem — e não precisa inventar agora
 *  — uma peça de "repetidor"; só os campos de cada linha passam a usar
 *  `Field`/`Input` do SDL. `Caixa` (checkbox-cartão) segue de `../campos`:
 *  único arquivo que o usa, sem segundo consumidor real para justificar
 *  promoção ao SDL (§18). */

function Contatos(props: PropsDaAba) {
  return (
    <Secao
      titulo="Contato na empresa"
      descricao="Quem atende, quem compra e quem cuida da contabilidade"
    >
      <LinhaDeCampos>
        <CampoDeTexto
          aba={props}
          campo="contatoNome"
          rotulo="Contato"
          maxLength={160}
          larguraSemantica="medio"
        />
        <CampoDeTexto
          aba={props}
          campo="contatoCelular"
          rotulo="Celular do contato"
          inputMode="tel"
          mascara={mascararTelefone}
          larguraSemantica="curto"
        />
        <CampoDeTexto
          aba={props}
          campo="comprador"
          rotulo="Comprador"
          maxLength={160}
          larguraSemantica="medio"
        />
        <CampoDeTexto
          aba={props}
          campo="compradorFone"
          rotulo="Fone do comprador"
          inputMode="tel"
          mascara={mascararTelefone}
          larguraSemantica="curto"
        />
        <CampoDeTexto
          aba={props}
          campo="contabilista"
          rotulo="Contabilista"
          maxLength={160}
          larguraSemantica="medio"
        />
      </LinhaDeCampos>
    </Secao>
  );
}

function Socios({ formulario, mudar, erros }: PropsDaAba) {
  const socios = formulario.socios;
  const alterar = (indice: number, campo: 'nome' | 'cpf', valor: string) =>
    mudar(
      'socios',
      socios.map((socio, posicao) => (posicao === indice ? { ...socio, [campo]: valor } : socio)),
    );
  return (
    <Secao
      titulo="Sócios"
      descricao="Quem responde pela empresa"
      acao={
        <button
          type="button"
          onClick={() => mudar('socios', [...socios, { nome: '', cpf: '' }])}
          disabled={socios.length >= 10}
          className="bg-surface-soft text-button-sm text-ink inline-flex h-8 items-center gap-1.5 rounded-full px-3 transition hover:bg-[#ececee] disabled:opacity-40"
        >
          <Plus size={14} aria-hidden="true" /> Sócio
        </button>
      }
    >
      {socios.length === 0 ? (
        <p className="text-body-sm text-stone">Nenhum sócio informado.</p>
      ) : (
        <ul className="grid gap-2">
          {socios.map((socio, indice) => (
            <li key={indice} className="bg-surface-soft/60 flex items-end gap-3 rounded-2xl p-3">
              <div className="min-w-0 flex-1">
                <Field label={`Sócio ${indice + 1}`}>
                  <Input
                    value={socio.nome}
                    maxLength={160}
                    onChange={(e) => alterar(indice, 'nome', e.target.value)}
                  />
                </Field>
              </div>
              <div className="w-44">
                <Field label="CPF">
                  <Input
                    value={socio.cpf}
                    inputMode="numeric"
                    onChange={(e) => alterar(indice, 'cpf', mascararDocumento(e.target.value))}
                  />
                </Field>
              </div>
              <button
                type="button"
                aria-label={`Remover sócio ${indice + 1}`}
                onClick={() =>
                  mudar(
                    'socios',
                    socios.filter((_, posicao) => posicao !== indice),
                  )
                }
                className="shadow-cartao inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#b3242f] transition hover:bg-[#fdeced]"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {erros.socios ? <p className="text-caption mt-2 text-[#b3242f]">{erros.socios}</p> : null}
    </Secao>
  );
}

function Fiscal(props: PropsDaAba) {
  const { formulario, mudar, sugestoes } = props;
  return (
    <Secao titulo="Atividade e regime" descricao="Ramo, segmento e enquadramentos fiscais">
      <LinhaDeCampos>
        <CampoDeTexto
          aba={props}
          campo="dataDeAbertura"
          rotulo="Data de abertura"
          type="date"
          larguraSemantica="curto"
        />
        <CampoDeTexto
          aba={props}
          campo="ramoDeAtividade"
          rotulo="Ramo de atividade"
          maxLength={160}
          sugestoes={sugestoes?.ramosDeAtividade}
          larguraSemantica="resto"
        />
        <CampoDeTexto
          aba={props}
          campo="segmento"
          rotulo="Segmento"
          maxLength={120}
          sugestoes={sugestoes?.segmentos}
          larguraSemantica="medio"
        />
        <CampoDeTexto
          aba={props}
          campo="inscricaoSuframa"
          rotulo="Inscrição Suframa"
          maxLength={20}
          larguraSemantica="medio"
        />
      </LinhaDeCampos>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Caixa
          rotulo="Substituto tributário"
          marcado={formulario.substitutoTributario}
          aoAlternar={(marcado) => mudar('substitutoTributario', marcado)}
        />
        <Caixa
          rotulo="Revendedor"
          marcado={formulario.revendedor}
          aoAlternar={(marcado) => mudar('revendedor', marcado)}
        />
        <Caixa
          rotulo="Órgão público"
          marcado={formulario.orgaoPublico}
          aoAlternar={(marcado) => mudar('orgaoPublico', marcado)}
        />
      </div>
    </Secao>
  );
}

function Tare(props: PropsDaAba) {
  const { formulario, mudar } = props;
  return (
    <Secao titulo="Regime especial (TARE)" descricao="Termo de acordo de regime especial, de Goiás">
      <Caixa
        rotulo="Empresa com TARE"
        marcado={formulario.temTare}
        aoAlternar={(marcado) => mudar('temTare', marcado)}
      />
      {formulario.temTare ? (
        <LinhaDeCampos>
          <CampoDeTexto
            aba={props}
            campo="numeroTare"
            rotulo="Número do TARE"
            maxLength={30}
            larguraSemantica="curto"
          />
          <div className="flex items-end pb-1">
            <Caixa
              rotulo="Participa do programa FOMENTAR / PRODUZIR"
              marcado={formulario.fomentarOuProduzir}
              aoAlternar={(marcado) => mudar('fomentarOuProduzir', marcado)}
            />
          </div>
        </LinhaDeCampos>
      ) : null}
    </Secao>
  );
}

export function AbaPessoaJuridica(props: PropsDaAba) {
  if (props.formulario.tipo !== 'PJ') {
    return (
      <Secao titulo="Pessoa jurídica" descricao="Contato, sócios e dados fiscais da empresa">
        <p className="text-body-sm text-stone">
          Esta aba vale para cliente pessoa jurídica. Mude o tipo de pessoa na aba Principal para
          preencher contato, sócios e dados fiscais da empresa.
        </p>
      </Secao>
    );
  }
  return (
    <div className="grid gap-4">
      <Contatos {...props} />
      <Socios {...props} />
      <Fiscal {...props} />
      <Tare {...props} />
      <Secao
        titulo="Observações da empresa"
        descricao="Só para a equipe; não sai em documento para o cliente"
      >
        <Field label="Anotação interna sobre a empresa">
          <AreaDeTexto
            value={props.formulario.observacaoInterna}
            rows={3}
            onChange={(e) => props.mudar('observacaoInterna', e.target.value)}
          />
        </Field>
      </Secao>
    </div>
  );
}

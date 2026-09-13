import { Building2, Plus, ScrollText, StickyNote, Trash2, UserRound, Users } from 'lucide-react';
import { Area, Bloco, Caixa, Campo, Grade, Texto } from '../campos';
import { mascararDocumento, mascararTelefone } from '../formato';
import type { PropsDaAba } from './aba';

/** Aba Pessoa Jurídica: quem atende, quem assina e o que o fisco pede de uma
 *  empresa. Some inteira para pessoa física — campo de sócio em cadastro de
 *  pessoa física é campo que ninguém preenche. */

function Contatos({ formulario, mudar, erros }: PropsDaAba) {
  return (
    <Bloco
      titulo="Contato na empresa"
      icone={UserRound}
      descricao="Quem atende, quem compra e quem cuida da contabilidade"
    >
      <Grade colunas={4}>
        <Campo rotulo="Contato" largura={2}>
          {({ id }) => (
            <Texto
              id={id}
              valor={formulario.contatoNome}
              maxLength={160}
              aoMudar={(valor) => mudar('contatoNome', valor)}
            />
          )}
        </Campo>
        <Campo rotulo="Celular do contato" erro={erros.contatoCelular ?? null}>
          {({ id, invalido }) => (
            <Texto
              id={id}
              valor={formulario.contatoCelular}
              invalido={invalido}
              inputMode="tel"
              aoMudar={(valor) => mudar('contatoCelular', mascararTelefone(valor))}
            />
          )}
        </Campo>
        <Campo rotulo="Comprador">
          {({ id }) => (
            <Texto
              id={id}
              valor={formulario.comprador}
              maxLength={160}
              aoMudar={(valor) => mudar('comprador', valor)}
            />
          )}
        </Campo>
        <Campo rotulo="Fone do comprador" erro={erros.compradorFone ?? null}>
          {({ id, invalido }) => (
            <Texto
              id={id}
              valor={formulario.compradorFone}
              invalido={invalido}
              inputMode="tel"
              aoMudar={(valor) => mudar('compradorFone', mascararTelefone(valor))}
            />
          )}
        </Campo>
        <Campo rotulo="Contabilista" largura={2}>
          {({ id }) => (
            <Texto
              id={id}
              valor={formulario.contabilista}
              maxLength={160}
              aoMudar={(valor) => mudar('contabilista', valor)}
            />
          )}
        </Campo>
      </Grade>
    </Bloco>
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
    <Bloco
      titulo="Sócios"
      icone={Users}
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
                <Campo rotulo={`Sócio ${indice + 1}`}>
                  {({ id }) => (
                    <Texto
                      id={id}
                      valor={socio.nome}
                      maxLength={160}
                      aoMudar={(valor) => alterar(indice, 'nome', valor)}
                    />
                  )}
                </Campo>
              </div>
              <div className="w-44">
                <Campo rotulo="CPF">
                  {({ id }) => (
                    <Texto
                      id={id}
                      valor={socio.cpf}
                      inputMode="numeric"
                      aoMudar={(valor) => alterar(indice, 'cpf', mascararDocumento(valor))}
                    />
                  )}
                </Campo>
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
    </Bloco>
  );
}

function Fiscal({ formulario, mudar, erros, sugestoes }: PropsDaAba) {
  return (
    <Bloco
      titulo="Atividade e regime"
      icone={Building2}
      descricao="Ramo, segmento e enquadramentos fiscais"
    >
      <Grade colunas={4}>
        <Campo rotulo="Data de abertura" erro={erros.dataDeAbertura ?? null}>
          {({ id, invalido }) => (
            <Texto
              id={id}
              type="date"
              valor={formulario.dataDeAbertura}
              invalido={invalido}
              aoMudar={(valor) => mudar('dataDeAbertura', valor)}
            />
          )}
        </Campo>
        <Campo rotulo="Ramo de atividade" largura={2}>
          {({ id }) => (
            <Texto
              id={id}
              valor={formulario.ramoDeAtividade}
              maxLength={160}
              sugestoes={sugestoes?.ramosDeAtividade}
              aoMudar={(valor) => mudar('ramoDeAtividade', valor)}
            />
          )}
        </Campo>
        <Campo rotulo="Segmento">
          {({ id }) => (
            <Texto
              id={id}
              valor={formulario.segmento}
              maxLength={120}
              sugestoes={sugestoes?.segmentos}
              aoMudar={(valor) => mudar('segmento', valor)}
            />
          )}
        </Campo>
        <Campo rotulo="Inscrição Suframa" erro={erros.inscricaoSuframa ?? null}>
          {({ id, invalido }) => (
            <Texto
              id={id}
              valor={formulario.inscricaoSuframa}
              invalido={invalido}
              maxLength={20}
              aoMudar={(valor) => mudar('inscricaoSuframa', valor)}
            />
          )}
        </Campo>
      </Grade>
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
    </Bloco>
  );
}

function Tare({ formulario, mudar, erros }: PropsDaAba) {
  return (
    <Bloco
      titulo="Regime especial (TARE)"
      icone={ScrollText}
      descricao="Termo de acordo de regime especial, de Goiás"
    >
      <Caixa
        rotulo="Empresa com TARE"
        marcado={formulario.temTare}
        aoAlternar={(marcado) => mudar('temTare', marcado)}
      />
      {formulario.temTare ? (
        <div className="mt-4">
          <Grade colunas={3}>
            <Campo rotulo="Número do TARE" erro={erros.numeroTare ?? null}>
              {({ id, invalido }) => (
                <Texto
                  id={id}
                  valor={formulario.numeroTare}
                  invalido={invalido}
                  maxLength={30}
                  aoMudar={(valor) => mudar('numeroTare', valor)}
                />
              )}
            </Campo>
            <div className="col-span-2 flex items-end">
              <Caixa
                rotulo="Participa do programa FOMENTAR / PRODUZIR"
                marcado={formulario.fomentarOuProduzir}
                aoAlternar={(marcado) => mudar('fomentarOuProduzir', marcado)}
              />
            </div>
          </Grade>
        </div>
      ) : null}
    </Bloco>
  );
}

export function AbaPessoaJuridica(props: PropsDaAba) {
  if (props.formulario.tipo !== 'PJ') {
    return (
      <Bloco
        titulo="Pessoa jurídica"
        icone={Building2}
        descricao="Contato, sócios e dados fiscais da empresa"
      >
        <p className="text-body-sm text-stone">
          Esta aba vale para cliente pessoa jurídica. Mude o tipo de pessoa na aba Principal para
          preencher contato, sócios e dados fiscais da empresa.
        </p>
      </Bloco>
    );
  }
  return (
    <div className="grid gap-4">
      <Contatos {...props} />
      <Socios {...props} />
      <Fiscal {...props} />
      <Tare {...props} />
      <Bloco
        titulo="Observações da empresa"
        icone={StickyNote}
        descricao="Só para a equipe; não sai em documento para o cliente"
      >
        <Campo rotulo="Anotação interna sobre a empresa" largura="tudo">
          {({ id }) => (
            <Area
              id={id}
              valor={props.formulario.observacaoInterna}
              linhas={3}
              aoMudar={(valor) => props.mudar('observacaoInterna', valor)}
            />
          )}
        </Campo>
      </Bloco>
    </div>
  );
}

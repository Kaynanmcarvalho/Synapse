/* eslint-disable max-lines-per-function, complexity */
import type { Funcionario } from '@synapse/types';
import { UserCog, UserPlus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { abaComErro } from '../cadastros/comum/caminho';
import { BOTAO_CLARO, SELO, TOM } from '../cadastros/comum/estilos';
import { JanelaDeCadastro } from '../cadastros/comum/JanelaDeCadastro';
import { useFicha } from '../cadastros/comum/useFicha';
import { formatarTelefone } from '../customers/formato';
import { AbaComissao } from './abas/AbaComissao';
import { AbaDocumentos, AbaRelatorios } from './abas/AbaDocumentosERelatorios';
import { AbaOutrasInformacoes } from './abas/AbaOutrasInformacoes';
import { AbaPrincipal } from './abas/AbaPrincipal';
import {
  ABAS_DO_FUNCIONARIO,
  abaDoCampo,
  abasComErro,
  doFuncionario,
  funcionarioVazio,
  validarFuncionario,
  type AbaDoFuncionario,
} from './formulario';
import { atualizarFuncionario, buscarFuncionario, criarFuncionario } from './funcionarios.api';
import { ManutencaoDeUsuario } from './ManutencaoDeUsuario';

/** Cadastro de Funcionários (Cadastros › Funcionários › Funcionários): as cinco
 *  abas do Syndata, F2 salva, F3 desfaz, Esc sai. */

const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('');

const idDoFuncionario = (funcionario: Funcionario) => funcionario.id;

export function JanelaDoFuncionario({
  funcionarioId,
  aoFechar,
  aoSalvar,
}: {
  readonly funcionarioId: string | null;
  readonly aoFechar: () => void;
  readonly aoSalvar?: () => void;
}) {
  const [aba, setAba] = useState<AbaDoFuncionario>('principal');
  const [usuarios, setUsuarios] = useState(false);
  const ficha = useFicha({
    id: funcionarioId,
    vazio: funcionarioVazio,
    daGravada: doFuncionario,
    buscar: buscarFuncionario,
    criar: criarFuncionario,
    atualizar: atualizarFuncionario,
    idDaGravada: idDoFuncionario,
    validar: validarFuncionario,
  });
  const gravado = ficha.gravada;
  const { salvar: gravar, limpar } = ficha;

  const salvar = useCallback(() => {
    void gravar().then((resultado) => {
      if (resultado.ok) aoSalvar?.();
      else {
        const primeira = abaComErro(
          resultado.erros,
          abaDoCampo,
          ABAS_DO_FUNCIONARIO.map((item) => item.id),
        );
        if (primeira) setAba(primeira);
      }
    });
  }, [gravar, aoSalvar]);

  const ligacao = { formulario: ficha.formulario, mudar: ficha.mudar, erros: ficha.erros };
  const demitido = Boolean(
    gravado?.demissao && gravado.demissao <= new Date().toISOString().slice(0, 10),
  );

  return (
    <JanelaDeCadastro
      rotuloDaTela="Cadastro de Funcionários"
      titulo={gravado ? `${gravado.codigo} - ${gravado.nome}` : 'Novo funcionário'}
      subtitulo={
        gravado ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-stone mr-1">
              {gravado.cargo.nome} · {gravado.departamento.nome}
              {gravado.celular ? ` · ${formatarTelefone(gravado.celular)}` : ''}
            </span>
            {gravado.comissao.vendedor ? (
              <span className={`${SELO} ${TOM.positivo}`}>Vendedor</span>
            ) : null}
            {gravado.bloqueado ? <span className={`${SELO} ${TOM.perigo}`}>Bloqueado</span> : null}
            {demitido ? <span className={`${SELO} ${TOM.alerta}`}>Demitido</span> : null}
            {gravado.usuario ? (
              <span className={`${SELO} ${TOM.neutro}`}>Login {gravado.usuario.email}</span>
            ) : null}
          </div>
        ) : (
          <p className="text-caption text-stone mt-0.5">
            O código é gerado quando o cadastro é salvo.
          </p>
        )
      }
      avatar={
        gravado ? (
          <span
            aria-hidden="true"
            className="bg-primary font-display text-body-md shadow-cartao flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-semibold text-white"
          >
            {iniciais(gravado.nome) || '?'}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="bg-brand-50 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          >
            <UserPlus size={20} />
          </span>
        )
      }
      abas={ABAS_DO_FUNCIONARIO}
      aba={aba}
      aoTrocarAba={setAba}
      abasComErro={abasComErro(ficha.erros)}
      carregando={ficha.carga.status === 'carregando'}
      erroDeCarga={ficha.carga.status === 'erro' ? ficha.carga.mensagem : null}
      erro={ficha.aviso}
      alterado={ficha.alterado}
      salvo={Boolean(gravado)}
      salvando={ficha.salvando}
      dicaDeNovo="Preencha nome e admissão e salve para gerar o código."
      aoSalvar={salvar}
      aoLimpar={limpar}
      aoSair={aoFechar}
      acoesExtras={
        <button
          type="button"
          onClick={() => setUsuarios(true)}
          disabled={!gravado}
          title={
            gravado ? 'Ligar um login do sistema a este funcionário' : 'Salve o cadastro primeiro'
          }
          className={BOTAO_CLARO}
        >
          <UserCog size={15} aria-hidden="true" /> Manutenção de Usuário
        </button>
      }
    >
      {aba === 'principal' ? <AbaPrincipal ficha={ligacao} gravado={gravado} /> : null}
      {aba === 'outras' ? <AbaOutrasInformacoes ficha={ligacao} /> : null}
      {aba === 'comissao' ? <AbaComissao ficha={ligacao} /> : null}
      {aba === 'documentos' ? <AbaDocumentos funcionarioId={gravado?.id ?? null} /> : null}
      {aba === 'relatorios' ? <AbaRelatorios funcionarioId={gravado?.id ?? null} /> : null}
      {usuarios && gravado ? (
        <ManutencaoDeUsuario
          funcionario={gravado}
          aoFechar={() => setUsuarios(false)}
          aoAlterar={(alterado) => {
            // Só o vínculo muda: o que está sendo digitado na ficha fica.
            ficha.substituirGravada(alterado);
            aoSalvar?.();
          }}
        />
      ) : null}
    </JanelaDeCadastro>
  );
}

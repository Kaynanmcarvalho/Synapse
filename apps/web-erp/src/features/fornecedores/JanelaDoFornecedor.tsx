/* eslint-disable max-lines-per-function, complexity */
import type { Supplier } from '@synapse/types';
import { Building2, Truck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { abaComErro } from '../cadastros/comum/caminho';
import { consultarCnpj } from '../cadastros/comum/cadastros.api';
import { SELO, TOM } from '../cadastros/comum/estilos';
import { JanelaDeCadastro } from '../cadastros/comum/JanelaDeCadastro';
import { useFicha } from '../cadastros/comum/useFicha';
import { formatarDocumento } from '../customers/formato';
import { AbaDocumentos } from './abas/AbaDocumentos';
import { AbaEscrituracao } from './abas/AbaEscrituracao';
import { AbaPrincipal } from './abas/AbaPrincipal';
import {
  ABAS_DO_FORNECEDOR,
  abaDoCampo,
  abasComErro,
  comConsulta,
  doFornecedor,
  fornecedorVazio,
  validarFornecedor,
  type AbaDoFornecedor,
} from './formulario';
import { atualizarFornecedor, buscarFornecedor, criarFornecedor } from './fornecedores.api';

/** Cadastro de Fornecedores (Cadastros › Fornecedores › Fornecedores): Principal,
 *  Documentos e Escrituração Digital. F2 salva, F3 desfaz, F4 consulta o CNPJ,
 *  Esc sai. */

const idDoFornecedor = (fornecedor: Supplier) => fornecedor.id;

export function JanelaDoFornecedor({
  fornecedorId,
  aoFechar,
  aoSalvar,
}: {
  readonly fornecedorId: string | null;
  readonly aoFechar: () => void;
  readonly aoSalvar?: () => void;
}) {
  const [aba, setAba] = useState<AbaDoFornecedor>('principal');
  const [consultando, setConsultando] = useState(false);
  const [avisoDaConsulta, setAvisoDaConsulta] = useState<string | null>(null);
  const ficha = useFicha({
    id: fornecedorId,
    vazio: fornecedorVazio,
    daGravada: doFornecedor,
    buscar: buscarFornecedor,
    criar: criarFornecedor,
    atualizar: atualizarFornecedor,
    idDaGravada: idDoFornecedor,
    validar: validarFornecedor,
  });
  const gravado = ficha.gravada;
  const { salvar: gravar, limpar, substituir, formulario } = ficha;

  const salvar = useCallback(() => {
    void gravar().then((resultado) => {
      if (resultado.ok) aoSalvar?.();
      else {
        const primeira = abaComErro(
          resultado.erros,
          abaDoCampo,
          ABAS_DO_FORNECEDOR.map((item) => item.id),
        );
        if (primeira) setAba(primeira);
      }
    });
  }, [gravar, aoSalvar]);

  const consultar = useCallback(async () => {
    const cnpj = formulario.documento.replace(/\D/g, '');
    if (formulario.tipoDePessoa !== 'JURIDICA' || cnpj.length !== 14) {
      setAvisoDaConsulta('Digite o CNPJ completo para consultar.');
      return;
    }
    setConsultando(true);
    setAvisoDaConsulta(null);
    try {
      const consulta = await consultarCnpj(cnpj);
      substituir((atual) => comConsulta(atual, consulta));
      setAvisoDaConsulta(
        `${consulta.situacao ? `Situação na Receita: ${consulta.situacao}. ` : ''}Fonte: ${consulta.fonte}. Confira a inscrição estadual.`,
      );
    } catch (falha: unknown) {
      setAvisoDaConsulta(
        falha instanceof Error ? falha.message : 'Não foi possível consultar o CNPJ',
      );
    } finally {
      setConsultando(false);
    }
  }, [formulario.documento, formulario.tipoDePessoa, substituir]);

  useEffect(() => {
    const naTecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'F4') return;
      evento.preventDefault();
      void consultar();
    };
    window.addEventListener('keydown', naTecla);
    return () => window.removeEventListener('keydown', naTecla);
  }, [consultar]);

  const ligacao = { formulario: ficha.formulario, mudar: ficha.mudar, erros: ficha.erros };

  return (
    <JanelaDeCadastro
      rotuloDaTela="Cadastro de Fornecedores"
      titulo={gravado ? `${gravado.codigo ?? '—'} - ${gravado.tradeName}` : 'Novo fornecedor'}
      subtitulo={
        gravado ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-stone mr-1 tabular-nums">
              {formatarDocumento(gravado.taxId)}
              {gravado.endereco?.cidade
                ? ` · ${gravado.endereco.cidade}/${gravado.endereco.uf}`
                : ''}
            </span>
            <span className={`${SELO} ${gravado.active ? TOM.positivo : TOM.neutro}`}>
              {gravado.active ? 'Ativo' : 'Inativo'}
            </span>
            {gravado.grupo ? (
              <span className={`${SELO} ${TOM.neutro}`}>Grupo {gravado.grupo.nome}</span>
            ) : null}
          </div>
        ) : (
          <p className="text-caption text-stone mt-0.5">
            O código é gerado quando o cadastro é salvo.
          </p>
        )
      }
      avatar={
        <span
          aria-hidden="true"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${gravado ? 'bg-primary shadow-cartao text-white' : 'bg-brand-50 text-primary'}`}
        >
          {gravado ? <Truck size={20} /> : <Building2 size={20} />}
        </span>
      }
      abas={ABAS_DO_FORNECEDOR}
      aba={aba}
      aoTrocarAba={setAba}
      abasComErro={abasComErro(ficha.erros)}
      carregando={ficha.carga.status === 'carregando'}
      erroDeCarga={ficha.carga.status === 'erro' ? ficha.carga.mensagem : null}
      erro={ficha.aviso ?? avisoDaConsulta}
      alterado={ficha.alterado}
      salvo={Boolean(gravado)}
      salvando={ficha.salvando}
      dicaDeNovo="Digite o CNPJ e use (F4) para preencher pela Receita."
      aoSalvar={salvar}
      aoLimpar={limpar}
      aoSair={aoFechar}
    >
      {aba === 'principal' ? (
        <AbaPrincipal
          ficha={ligacao}
          gravado={gravado}
          consultando={consultando}
          aoConsultarCnpj={() => void consultar()}
        />
      ) : null}
      {aba === 'documentos' ? <AbaDocumentos fornecedorId={gravado?.id ?? null} /> : null}
      {aba === 'escrituracao' ? <AbaEscrituracao ficha={ligacao} /> : null}
    </JanelaDeCadastro>
  );
}

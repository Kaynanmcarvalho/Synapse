/* eslint-disable max-lines-per-function */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { definirCaminho, type ErrosDaFicha } from './caminho';

/** O estado de uma ficha de cadastro: carrega a gravada, edita campo a campo,
 *  valida no salvar com o mesmo schema da API e grava.
 *
 *  A validação roda no salvar, e não a cada tecla; depois de uma tentativa, o
 *  campo corrigido limpa o próprio aviso. */

export type CargaDaFicha<R> =
  | { readonly status: 'novo' }
  | { readonly status: 'carregando' }
  | { readonly status: 'pronto'; readonly gravada: R }
  | { readonly status: 'erro'; readonly mensagem: string };

export type Validacao =
  | { readonly ok: true; readonly corpo: unknown }
  | { readonly ok: false; readonly erros: ErrosDaFicha };

export interface OpcoesDaFicha<F, R> {
  readonly id: string | null;
  readonly vazio: () => F;
  readonly daGravada: (gravada: R) => F;
  readonly buscar: (id: string) => Promise<R>;
  readonly criar: (corpo: unknown) => Promise<R>;
  readonly atualizar: (id: string, corpo: unknown) => Promise<R>;
  readonly idDaGravada: (gravada: R) => string;
  readonly validar: (formulario: F) => Validacao;
}

export type ResultadoDoSalvar<R> =
  { readonly ok: true; readonly gravada: R } | { readonly ok: false; readonly erros: ErrosDaFicha };

const mensagemDe = (erro: unknown, padrao: string) =>
  erro instanceof Error ? erro.message : padrao;

export function useFicha<F, R>(opcoes: OpcoesDaFicha<F, R>) {
  const { id, vazio, daGravada, buscar, criar, atualizar, idDaGravada, validar } = opcoes;
  const [formulario, setFormulario] = useState<F>(vazio);
  const [inicial, setInicial] = useState<F>(vazio);
  const [carga, setCarga] = useState<CargaDaFicha<R>>(
    id ? { status: 'carregando' } : { status: 'novo' },
  );
  const [erros, setErros] = useState<ErrosDaFicha>({});
  const [erroDaApi, setErroDaApi] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const aplicar = useCallback(
    (gravada: R | null) => {
      const campos = gravada ? daGravada(gravada) : vazio();
      setFormulario(campos);
      setInicial(campos);
      setCarga(gravada ? { status: 'pronto', gravada } : { status: 'novo' });
    },
    [daGravada, vazio],
  );

  useEffect(() => {
    let ativo = true;
    if (!id) {
      aplicar(null);
      return undefined;
    }
    setCarga({ status: 'carregando' });
    buscar(id)
      .then((gravada) => ativo && aplicar(gravada))
      .catch((erro: unknown) => {
        if (ativo)
          setCarga({ status: 'erro', mensagem: mensagemDe(erro, 'Cadastro não encontrado.') });
      });
    return () => {
      ativo = false;
    };
    // `buscar` e `aplicar` são estáveis por quem usa; recarregar só quando o id muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const mudar = useCallback((caminho: string, valor: unknown) => {
    setFormulario((atual) => definirCaminho(atual, caminho, valor));
    setErros((atuais) => (atuais[caminho] ? { ...atuais, [caminho]: undefined } : atuais));
  }, []);

  /** Troca a ficha gravada (vínculo de login, foto) sem mexer no que está digitado. */
  const substituirGravada = useCallback((gravada: R) => {
    setCarga({ status: 'pronto', gravada });
  }, []);

  const substituir = useCallback((mudarTudo: (atual: F) => F) => {
    setFormulario((atual) => mudarTudo(atual));
  }, []);

  const limpar = useCallback(() => {
    setFormulario(inicial);
    setErros({});
    setErroDaApi(null);
  }, [inicial]);

  const alterado = useMemo(
    () => JSON.stringify(formulario) !== JSON.stringify(inicial),
    [formulario, inicial],
  );

  const salvar = useCallback(async (): Promise<ResultadoDoSalvar<R>> => {
    const validacao = validar(formulario);
    if (!validacao.ok) {
      setErros(validacao.erros);
      setErroDaApi(null);
      return { ok: false, erros: validacao.erros };
    }
    setSalvando(true);
    setErroDaApi(null);
    try {
      const gravada =
        carga.status === 'pronto'
          ? await atualizar(idDaGravada(carga.gravada), validacao.corpo)
          : await criar(validacao.corpo);
      aplicar(gravada);
      return { ok: true, gravada };
    } catch (erro: unknown) {
      setErroDaApi(mensagemDe(erro, 'Não foi possível salvar o cadastro.'));
      return { ok: false, erros: {} };
    } finally {
      setSalvando(false);
    }
  }, [aplicar, atualizar, carga, criar, formulario, idDaGravada, validar]);

  const avisoDoRodape =
    erroDaApi ?? (Object.values(erros).some(Boolean) ? 'Confira os campos destacados.' : null);

  return {
    carga,
    gravada: carga.status === 'pronto' ? carga.gravada : null,
    formulario,
    mudar,
    substituir,
    limpar,
    alterado,
    erros,
    aviso: avisoDoRodape,
    salvando,
    salvar,
    aplicar,
    substituirGravada,
  };
}

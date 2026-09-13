import type { CadastroDoCliente } from '@synapse/types';
import { useCallback, useEffect, useState } from 'react';
import { buscarCadastro, salvarCadastro, type CamposDoCadastro } from '../analise.api';

export type EstadoDoCadastro =
  | { readonly status: 'carregando' }
  | { readonly status: 'erro'; readonly mensagem: string }
  | { readonly status: 'pronto'; readonly cadastro: CadastroDoCliente };

const mensagemDe = (erro: unknown, padrao: string): string =>
  erro instanceof Error ? erro.message : padrao;

/** Carrega o cadastro e salva as correcoes. O salvar devolve a mensagem de erro
 *  da API (CNPJ incompleto, e-mail invalido) para o formulario mostrar. */
export const useCadastro = (customerId: string) => {
  const [estado, setEstado] = useState<EstadoDoCadastro>({ status: 'carregando' });
  const [salvando, setSalvando] = useState(false);
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setEstado({ status: 'carregando' });
    buscarCadastro(customerId)
      .then((cadastro) => ativo && setEstado({ status: 'pronto', cadastro }))
      .catch((erro: unknown) => {
        if (ativo)
          setEstado({ status: 'erro', mensagem: mensagemDe(erro, 'Cadastro indisponível.') });
      });
    return () => {
      ativo = false;
    };
  }, [customerId]);

  const salvar = useCallback(
    async (campos: CamposDoCadastro): Promise<CadastroDoCliente | null> => {
      setSalvando(true);
      setErroAoSalvar(null);
      try {
        const cadastro = await salvarCadastro(customerId, campos);
        setEstado({ status: 'pronto', cadastro });
        return cadastro;
      } catch (erro) {
        setErroAoSalvar(mensagemDe(erro, 'Não foi possível salvar o cadastro.'));
        return null;
      } finally {
        setSalvando(false);
      }
    },
    [customerId],
  );

  return { estado, salvando, erroAoSalvar, salvar };
};

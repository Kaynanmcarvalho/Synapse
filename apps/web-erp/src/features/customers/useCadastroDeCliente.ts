import type { Customer, SugestoesDoCadastro } from '@synapse/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/dev-auth';
import { atualizarCliente, buscarCliente, criarCliente, sugestoesDoCadastro } from './clientes.api';
import { doCliente, FORMULARIO_VAZIO, paraEnvio, type FormularioDoCliente } from './formulario';
import { primeiraAbaComErro, validar, type ErrosDoFormulario } from './validacao';

/** O estado da janela de cadastro: carrega, edita, valida e salva.
 *
 *  A validação roda no salvar, e não a cada tecla: aviso vermelho enquanto a
 *  pessoa ainda está digitando o CNPJ atrapalha mais do que ajuda. Depois de
 *  uma tentativa, o campo corrigido limpa o próprio aviso. */

export type EstadoDaCarga =
  | { readonly status: 'novo' }
  | { readonly status: 'carregando' }
  | { readonly status: 'pronto'; readonly cliente: Customer }
  | { readonly status: 'erro'; readonly mensagem: string };

export interface Vendedor {
  readonly id: string;
  readonly name: string;
}

export type ResultadoDoSalvar =
  | { readonly ok: true; readonly cliente: Customer }
  | { readonly ok: false; readonly aba: string | null };

const mensagemDe = (erro: unknown, padrao: string) =>
  erro instanceof Error ? erro.message : padrao;

/** Sugestões e vendedores são conveniências: sem permissão para lê-los, a tela
 *  continua funcionando com campo de texto. */
const useApoioDoCadastro = () => {
  const [sugestoes, setSugestoes] = useState<SugestoesDoCadastro | null>(null);
  const [vendedores, setVendedores] = useState<readonly Vendedor[] | null>(null);
  useEffect(() => {
    let ativo = true;
    sugestoesDoCadastro()
      .then((valores) => ativo && setSugestoes(valores))
      .catch(() => undefined);
    apiRequest<readonly Vendedor[]>('/field-sales/sellers')
      .then((lista) => ativo && setVendedores(lista))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);
  return { sugestoes, vendedores };
};

/** Lê a ficha gravada e entrega o cliente a quem monta o formulário. */
const useCargaDoCliente = (
  clienteId: string | null,
  aoCarregar: (cliente: Customer | null) => void,
) => {
  const [carga, setCarga] = useState<EstadoDaCarga>(
    clienteId ? { status: 'carregando' } : { status: 'novo' },
  );
  useEffect(() => {
    let ativo = true;
    if (!clienteId) {
      setCarga({ status: 'novo' });
      aoCarregar(null);
      return;
    }
    setCarga({ status: 'carregando' });
    buscarCliente(clienteId)
      .then((cliente) => {
        if (!ativo) return;
        setCarga({ status: 'pronto', cliente });
        aoCarregar(cliente);
      })
      .catch((erro: unknown) => {
        if (ativo) {
          setCarga({ status: 'erro', mensagem: mensagemDe(erro, 'Cliente não encontrado.') });
        }
      });
    return () => {
      ativo = false;
    };
  }, [clienteId, aoCarregar]);
  return { carga, setCarga };
};

/** O pedido de conferência acompanha os avisos ainda abertos: corrigido o último
 *  campo, o rodapé para de pedir. Erro da API fica até a próxima tentativa. */
const avisoDoRodape = (erroDaApi: string | null, erros: ErrosDoFormulario): string | null =>
  erroDaApi ?? (Object.values(erros).some(Boolean) ? 'Confira os campos destacados.' : null);

export const useCadastroDeCliente = (clienteId: string | null) => {
  const [formulario, setFormulario] = useState<FormularioDoCliente>(FORMULARIO_VAZIO);
  const [inicial, setInicial] = useState<FormularioDoCliente>(FORMULARIO_VAZIO);
  const [erros, setErros] = useState<ErrosDoFormulario>({});
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const apoio = useApoioDoCadastro();

  const aoCarregar = useCallback((cliente: Customer | null) => {
    const campos = cliente ? doCliente(cliente) : FORMULARIO_VAZIO;
    setFormulario(campos);
    setInicial(campos);
  }, []);
  const { carga, setCarga } = useCargaDoCliente(clienteId, aoCarregar);

  const mudar = useCallback(
    <C extends keyof FormularioDoCliente>(campo: C, valor: FormularioDoCliente[C]) => {
      setFormulario((atual) => ({ ...atual, [campo]: valor }));
      setErros((atuais) => (atuais[campo] ? { ...atuais, [campo]: undefined } : atuais));
    },
    [],
  );

  const limpar = useCallback(() => {
    setFormulario(inicial);
    setErros({});
    setErroAoSalvar(null);
  }, [inicial]);

  const alterado = useMemo(
    () => JSON.stringify(formulario) !== JSON.stringify(inicial),
    [formulario, inicial],
  );

  /** Salva e devolve o cliente gravado — ou a aba que precisa abrir por causa
   *  de um campo inválido. */
  const salvar = useCallback(async (): Promise<ResultadoDoSalvar> => {
    const encontrados = validar(formulario);
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados);
      setErroAoSalvar(null);
      return { ok: false, aba: primeiraAbaComErro(encontrados) };
    }
    setSalvando(true);
    setErroAoSalvar(null);
    try {
      const corpo = paraEnvio(formulario);
      const gravado =
        carga.status === 'pronto'
          ? await atualizarCliente(carga.cliente.id, corpo)
          : await criarCliente(corpo);
      setCarga({ status: 'pronto', cliente: gravado });
      aoCarregar(gravado);
      return { ok: true, cliente: gravado };
    } catch (erro: unknown) {
      setErroAoSalvar(mensagemDe(erro, 'Não foi possível salvar o cadastro.'));
      return { ok: false, aba: null };
    } finally {
      setSalvando(false);
    }
  }, [carga, formulario, setCarga, aoCarregar]);

  return {
    carga,
    formulario,
    mudar,
    limpar,
    salvar,
    salvando,
    erros,
    erroAoSalvar: avisoDoRodape(erroAoSalvar, erros),
    alterado,
    ...apoio,
    cliente: carga.status === 'pronto' ? carga.cliente : null,
  };
};

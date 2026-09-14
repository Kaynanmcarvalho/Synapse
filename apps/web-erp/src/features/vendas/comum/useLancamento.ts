import { PRODUCT_STATUS_ALLOWS_SALE, type Product } from '@synapse/types';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { escreverMoeda, formatarMoeda, lerMoeda } from '../../customers/formato';
import { lerEtiquetaDeBalanca } from './balanca';
import {
  brutoDaLinha,
  descontoDoPrecoDigitado,
  escreverQuantidade,
  lerQuantidade,
  linhaDoProduto,
  separarMultiplicador,
  type LinhaDaVenda,
} from './itens';
import { produtoPorCodigo, produtoPorId, resolverPreco } from './vendas.api';

/** O estado do lançamento de item (produto, quantidade, valor, alteração) e o
 *  que o Enter faz em cada campo. A tela conversa com ele pelo `ref`. */

export interface ControleDoLancamento {
  readonly definirProduto: (produto: Product) => void;
  readonly focarProduto: () => void;
  readonly focarQuantidade: () => void;
  readonly alterar: (linha: LinhaDaVenda) => void;
  readonly produtoAtual: () => Product | null;
  readonly limpar: () => void;
}

export interface OpcoesDoLancamento {
  readonly ref?: Ref<ControleDoLancamento>;
  readonly filialId: string;
  readonly customerId: string | null;
  readonly lancarAoLerCodigo: boolean;
  readonly aoLancar: (linha: LinhaDaVenda, substituir: string | null) => void;
  readonly aoBuscar: (termo: string) => void;
  readonly aoEtiquetaDeBalanca?: (codigo: string) => boolean;
}

// eslint-disable-next-line max-lines-per-function
export const useLancamento = ({
  ref,
  filialId,
  customerId,
  lancarAoLerCodigo,
  aoLancar,
  aoBuscar,
  aoEtiquetaDeBalanca,
}: OpcoesDoLancamento) => {
  const campoProduto = useRef<HTMLInputElement>(null);
  const campoQuantidade = useRef<HTMLInputElement>(null);
  const campoValor = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  const [produto, setProduto] = useState<Product | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [precoDeTabela, setPrecoDeTabela] = useState<number | null>(null);
  const [valorDigitado, setValorDigitado] = useState(false);
  const [edicao, setEdicao] = useState<LinhaDaVenda | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const limpar = () => {
    setTexto('');
    setProduto(null);
    setQuantidade('1');
    setValor('');
    setPrecoDeTabela(null);
    setValorDigitado(false);
    setEdicao(null);
    setAviso(null);
  };

  const preco = (alvo: Product, milesimos: number) =>
    resolverPreco({
      productId: alvo.id,
      branchId: filialId,
      quantidadeMilesimos: milesimos,
      customerId,
    });

  const lancar = async ({
    alvo,
    textoDaQuantidade,
    edicaoAtual,
  }: {
    readonly alvo: Product | null;
    readonly textoDaQuantidade: string;
    readonly edicaoAtual: LinhaDaVenda | null;
  }) => {
    if (!alvo) {
      setAviso('Informe o produto');
      campoProduto.current?.focus();
      return;
    }
    const milesimos = lerQuantidade(textoDaQuantidade);
    if (!milesimos) {
      setAviso('Quantidade inválida');
      campoQuantidade.current?.focus();
      return;
    }
    setOcupado(true);
    try {
      const tabela = await preco(alvo, milesimos);
      const digitado = valorDigitado ? lerMoeda(valor) : tabela;
      if (digitado > tabela) {
        setAviso(`Valor acima do preço de tabela (${formatarMoeda(tabela)})`);
        campoValor.current?.focus();
        return;
      }
      const linha = linhaDoProduto(alvo, {
        quantidade: milesimos,
        precoCentavos: tabela,
        descontoCentavos: descontoDoPrecoDigitado(milesimos, tabela, digitado),
      });
      aoLancar(
        edicaoAtual ? { ...linha, lote: edicaoAtual.lote, serie: edicaoAtual.serie } : linha,
        edicaoAtual ? edicaoAtual.chave : null,
      );
      limpar();
      campoProduto.current?.focus();
    } catch (falha: unknown) {
      setAviso(falha instanceof Error ? falha.message : 'Não foi possível lançar o item');
    } finally {
      setOcupado(false);
    }
  };

  const definirProduto = async (alvo: Product, textoDaQuantidade = quantidade) => {
    if (!PRODUCT_STATUS_ALLOWS_SALE[alvo.status]) {
      setAviso(`${alvo.sku} - ${alvo.name} não pode ser vendido`);
      return;
    }
    setProduto(alvo);
    setTexto(`${alvo.sku} - ${alvo.name}`);
    setAviso(null);
    if (lancarAoLerCodigo) {
      await lancar({ alvo, textoDaQuantidade, edicaoAtual: null });
      return;
    }
    setOcupado(true);
    try {
      const tabela = await preco(alvo, lerQuantidade(textoDaQuantidade) ?? 1000);
      setPrecoDeTabela(tabela);
      setValor(escreverMoeda(tabela));
      setValorDigitado(false);
      campoQuantidade.current?.focus();
      campoQuantidade.current?.select();
    } catch (falha: unknown) {
      setAviso(falha instanceof Error ? falha.message : 'Não foi possível buscar o preço');
    } finally {
      setOcupado(false);
    }
  };

  const procurar = async () => {
    const limpo = texto.trim();
    if (!limpo && !lancarAoLerCodigo) aoBuscar('');
    if (!limpo) return;
    if (produto && limpo === `${produto.sku} - ${produto.name}`) {
      campoQuantidade.current?.focus();
      return;
    }
    await procurarCodigo(limpo);
  };

  const procurarCodigo = async (limpo: string) => {
    const separado = separarMultiplicador(limpo);
    const { codigo } = separado;
    const textoDaQuantidade = separado.quantidade ?? quantidade;
    if (separado.quantidade) setQuantidade(separado.quantidade);
    setOcupado(true);
    try {
      const achado = await produtoPorCodigo(codigo);
      if (achado) {
        setOcupado(false);
        await definirProduto(achado, textoDaQuantidade);
        return;
      }
      if (lerEtiquetaDeBalanca(codigo) && aoEtiquetaDeBalanca?.(codigo)) {
        setTexto('');
        return;
      }
      aoBuscar(codigo);
    } catch (falha: unknown) {
      setAviso(falha instanceof Error ? falha.message : 'Não foi possível buscar o produto');
    } finally {
      setOcupado(false);
    }
  };

  useImperativeHandle(ref, () => ({
    definirProduto: (alvo) => void definirProduto(alvo),
    focarProduto: () => campoProduto.current?.focus(),
    focarQuantidade: () => {
      campoQuantidade.current?.focus();
      campoQuantidade.current?.select();
    },
    alterar: (linha) => {
      setEdicao(linha);
      setAviso(null);
      setQuantidade(escreverQuantidade(linha.quantidade));
      const liquidoUnitario = Math.round(
        ((brutoDaLinha(linha) - linha.descontoCentavos) * 1000) / linha.quantidade,
      );
      setPrecoDeTabela(linha.precoCentavos);
      setValor(escreverMoeda(liquidoUnitario));
      setValorDigitado(linha.descontoCentavos > 0);
      setTexto(`${linha.codigo} - ${linha.descricao}`);
      produtoPorId(linha.productId)
        .then((alvo) => {
          setProduto(alvo);
          campoQuantidade.current?.focus();
          campoQuantidade.current?.select();
        })
        .catch((falha: unknown) =>
          setAviso(falha instanceof Error ? falha.message : 'Produto não encontrado'),
        );
    },
    produtoAtual: () => produto,
    limpar,
  }));

  return {
    campoProduto,
    campoQuantidade,
    campoValor,
    texto,
    setTexto,
    produto,
    setProduto,
    quantidade,
    setQuantidade,
    valor,
    setValor,
    precoDeTabela,
    setValorDigitado,
    edicao,
    ocupado,
    aviso,
    procurar,
    lancar,
  };
};

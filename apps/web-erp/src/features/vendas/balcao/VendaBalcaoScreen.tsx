/* eslint-disable max-lines-per-function */
import type { ClienteNaLista, PedidoDeVenda, Product } from '@synapse/types';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROTAS } from '../../../app/rotas';
import type { VendedorNaLista } from '../../funcionarios/funcionarios.api';
import { BarraDeAtalhos, PainelDeTotais } from '../comum/BarraDeAtalhos';
import { BotoesDaGrade, type AcaoDaGrade } from '../comum/BotoesDaGrade';
import { GradeDeItens } from '../comum/GradeDeItens';
import { LancamentoDeItem, type ControleDoLancamento } from '../comum/LancamentoDeItem';
import { doPedido, repetirItens } from '../comum/repetirItens';
import { SemFilial } from '../comum/SemFilial';
import { useAtalhosDaTela } from '../comum/useAtalhosDaTela';
import { useFilial } from '../comum/useFilial';
import { useVendaEmAndamento } from '../comum/useVendaEmAndamento';
import { CabecalhoDoBalcao } from './CabecalhoDoBalcao';
import { FecharDocumento } from './FecharDocumento';
import { JanelasDoBalcao, type JanelaDoBalcao } from './JanelasDoBalcao';

/** Vendas › Venda Balcão: o Ponto de Vendas do Syndata. O vendedor lança os
 *  produtos, fecha o documento e o pedido cai na Análise de Crédito; o pedido
 *  de venda (sem valor fiscal) sai na hora para o cliente assinar. */

const CHAVE_DO_CLIENTE = 'synapse:balcao:cliente';
const PRODUTOS: JanelaDoBalcao = { tipo: 'produtos', lista: { tipo: 'busca', termo: '' } };

const lerCliente = (): ClienteNaLista | null => {
  try {
    const guardado = window.localStorage.getItem(CHAVE_DO_CLIENTE);
    return guardado ? (JSON.parse(guardado) as ClienteNaLista) : null;
  } catch {
    return null;
  }
};

export function VendaBalcaoScreen() {
  const navigate = useNavigate();
  const { filiais, filial, filialId, escolher: escolherFilial, erro: erroDaFilial } = useFilial();
  const venda = useVendaEmAndamento('synapse:balcao:itens');
  const lancamento = useRef<ControleDoLancamento>(null);
  const [cliente, setCliente] = useState<ClienteNaLista | null>(lerCliente);
  const [vendedor, setVendedor] = useState<VendedorNaLista | null>(null);
  const [janela, setJanela] = useState<JanelaDoBalcao | null>(null);
  const [fechando, setFechando] = useState(false);
  const [ultimo, setUltimo] = useState<PedidoDeVenda | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { linhaSelecionada: linha } = venda;

  useEffect(() => {
    try {
      if (cliente) window.localStorage.setItem(CHAVE_DO_CLIENTE, JSON.stringify(cliente));
      else window.localStorage.removeItem(CHAVE_DO_CLIENTE);
    } catch {
      // Sem armazenamento, o cliente vale enquanto a tela está aberta.
    }
  }, [cliente]);

  const abrirSimilar = () => {
    const atual = lancamento.current?.produtoAtual() ?? null;
    const base = atual
      ? { categoriaId: atual.categoryId, id: atual.id, nome: atual.name }
      : linha && { categoriaId: linha.categoriaId, id: linha.productId, nome: linha.descricao };
    if (!base?.categoriaId) {
      setAviso('Digite um produto com categoria para ver os similares');
      return;
    }
    setJanela({
      tipo: 'produtos',
      lista: {
        tipo: 'similar',
        categoriaId: base.categoriaId,
        semProduto: base.id,
        nome: base.nome,
      },
    });
  };

  const abrirSugestao = () => {
    if (!cliente) setAviso('Informe o cliente (F11) para ver as sugestões');
    else
      setJanela({
        tipo: 'produtos',
        lista: { tipo: 'sugestao', customerId: cliente.id, cliente: cliente.nome },
      });
  };

  const acoes: Readonly<Record<AcaoDaGrade, () => void>> = {
    alterar: () => linha && lancamento.current?.alterar(linha),
    excluir: () => linha && venda.excluir(linha.chave),
    copiar: () => linha && venda.copiar(linha.chave),
    desconto: () => setJanela({ tipo: 'desconto' }),
    lote: () => linha && setJanela({ tipo: 'lote' }),
    serie: () => undefined,
    produto: () => setJanela(PRODUTOS),
    similar: abrirSimilar,
    sugestao: abrirSugestao,
  };

  const acionar = (acao: AcaoDaGrade) => {
    setAviso(null);
    acoes[acao]();
  };

  const limparTela = () => {
    if (venda.linhas.length && !window.confirm('Limpar a tela? Os itens lançados saem da venda.'))
      return;
    venda.limpar();
    lancamento.current?.limpar();
    setCliente(null);
    setAviso(null);
    lancamento.current?.focarProduto();
  };

  const fecharDocumento = () => {
    if (!venda.linhas.length) setAviso('Lance ao menos um produto antes de fechar');
    else if (!vendedor) setAviso('Escolha o vendedor');
    else setFechando(true);
  };

  const sair = () => {
    if (venda.linhas.length && !window.confirm('Sair do Ponto de Vendas? A venda fica guardada.'))
      return;
    navigate(ROTAS.inicio);
  };

  const copiarPedido = async (pedido: PedidoDeVenda) => {
    if (!filialId) return;
    setJanela(null);
    try {
      const copiadas = await repetirItens(pedido.itens.map(doPedido), {
        filialId,
        customerId: pedido.customerId,
      });
      venda.substituirTodas([...venda.linhas, ...copiadas]);
      setAviso(`Itens do pedido ${pedido.numero} copiados com o preço de hoje`);
    } catch (falha: unknown) {
      setAviso(falha instanceof Error ? falha.message : 'Não foi possível copiar o pedido');
    }
  };

  const fecharJanela = () => {
    setJanela(null);
    if (!fechando) lancamento.current?.focarProduto();
  };

  useAtalhosDaTela(
    {
      F3: fecharDocumento,
      'Ctrl+X': limparTela,
      F11: () => setJanela({ tipo: 'cliente' }),
      F12: () => setJanela(PRODUTOS),
      'Ctrl+H': () => setJanela({ tipo: 'historico' }),
      F9: sair,
      F2: () => lancamento.current?.focarQuantidade(),
    },
    !janela && !fechando,
  );

  if (!filialId || !filial) return <SemFilial carregando={filiais === null} erro={erroDaFilial} />;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1500px] flex-col gap-3 px-4 py-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption text-stone font-semibold uppercase tracking-[0.12em]">
            Vendas · Venda Balcão
          </p>
          <h1 className="font-display text-heading-md text-ink">Ponto de Vendas</h1>
        </div>
        {filiais && filiais.length > 1 ? (
          <select
            value={filialId}
            onChange={(evento) => escolherFilial(evento.target.value)}
            aria-label="Filial"
            className="border-hairline-light text-body-sm h-10 rounded-xl border bg-white px-3"
          >
            {filiais.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-body-sm text-stone">{filial.name}</span>
        )}
      </header>

      <CabecalhoDoBalcao
        ultimo={ultimo}
        cliente={cliente}
        vendedor={vendedor}
        aoMudarVendedor={setVendedor}
        aoAbrirHistorico={() => setJanela({ tipo: 'historico' })}
        aoAbrirCliente={() => setJanela({ tipo: 'cliente' })}
        aoImprimirUltimo={() => ultimo && setJanela({ tipo: 'impressao', pedidoId: ultimo.id })}
        aoDispensarUltimo={() => setUltimo(null)}
      />

      <LancamentoDeItem
        ref={lancamento}
        filialId={filialId}
        customerId={cliente?.id ?? null}
        lancarAoLerCodigo={false}
        aoLancar={venda.lancar}
        aoBuscar={(termo) => setJanela({ tipo: 'produtos', lista: { tipo: 'busca', termo } })}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <BotoesDaGrade
          acoes={['alterar', 'excluir', 'copiar', 'desconto', 'lote', 'sugestao', 'similar']}
          temLinha={Boolean(linha)}
          temItens={venda.linhas.length > 0}
          aoAcionar={acionar}
        />
        {aviso ? <p className="text-caption text-[#8a4b00]">{aviso}</p> : null}
      </div>

      <GradeDeItens
        linhas={venda.linhas}
        selecionada={venda.selecionada}
        aoSelecionar={venda.setSelecionada}
        aoAlterar={(chave) => {
          const alvo = venda.linhas.find((item) => item.chave === chave);
          if (alvo) lancamento.current?.alterar(alvo);
        }}
        aoExcluir={venda.excluir}
        vazio="Nenhum item lançado. Digite o código do produto ou aperte F12."
      />

      <PainelDeTotais totais={venda.totais} mostrarPeso />

      <BarraDeAtalhos
        atalhos={[
          { tecla: 'Ctrl+X', rotulo: 'Limpar Tela', acao: limparTela },
          { tecla: 'F11', rotulo: 'Clientes', acao: () => setJanela({ tipo: 'cliente' }) },
          { tecla: 'F12', rotulo: 'Produtos', acao: () => setJanela(PRODUTOS) },
          {
            tecla: 'Ctrl+H',
            rotulo: 'Histórico de Vendas',
            acao: () => setJanela({ tipo: 'historico' }),
          },
          { tecla: 'F9', rotulo: 'Sair', acao: sair },
          {
            tecla: 'F3',
            rotulo: 'Fechar Documento',
            acao: fecharDocumento,
            principal: true,
            desabilitado: venda.linhas.length === 0,
          },
        ]}
      />

      {fechando ? (
        <FecharDocumento
          filialId={filialId}
          cliente={cliente}
          vendedor={vendedor}
          linhas={venda.linhas}
          totais={venda.totais}
          atalhosAtivos={!janela}
          aoTrocarCliente={() => setJanela({ tipo: 'cliente' })}
          aoFechar={() => setFechando(false)}
          aoConcluir={(pedido) => {
            setFechando(false);
            setUltimo(pedido);
            venda.limpar();
            lancamento.current?.limpar();
            setCliente(null);
            setJanela({ tipo: 'impressao', pedidoId: pedido.id });
          }}
        />
      ) : null}

      <JanelasDoBalcao
        janela={janela}
        venda={venda}
        limiteDeDesconto={vendedor?.descontoMaximoPercentual ?? null}
        vendedorId={vendedor?.id ?? null}
        aoFechar={fecharJanela}
        aoAbrir={setJanela}
        aoEscolherProduto={(produto: Product) => {
          setJanela(null);
          lancamento.current?.definirProduto(produto);
        }}
        aoEscolherCliente={(escolhido) => {
          setCliente(escolhido);
          setJanela(null);
        }}
        aoCopiarPedido={(pedido) => void copiarPedido(pedido)}
      />
    </main>
  );
}

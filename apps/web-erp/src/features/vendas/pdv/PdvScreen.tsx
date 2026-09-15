/* eslint-disable max-lines-per-function */
import type { PosSale, Product } from '@synapse/types';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROTAS } from '../../../app/rotas';
import type { VendedorNaLista } from '../../funcionarios/funcionarios.api';
import { BarraDeAtalhos, PainelDeTotais } from '../comum/BarraDeAtalhos';
import { BotoesDaGrade, type AcaoDaGrade } from '../comum/BotoesDaGrade';
import { abrirGavetaSeLembrada, acionarGaveta } from '../comum/gaveta';
import { GradeDeItens } from '../comum/GradeDeItens';
import { LancamentoDeItem, type ControleDoLancamento } from '../comum/LancamentoDeItem';
import { daVenda, repetirItens } from '../comum/repetirItens';
import { SemFilial } from '../comum/SemFilial';
import { useAtalhosDaTela } from '../comum/useAtalhosDaTela';
import { useFilial } from '../comum/useFilial';
import { useGuardado } from '../comum/useGuardado';
import { useVendaEmAndamento } from '../comum/useVendaEmAndamento';
import { abrirDanfe } from '../comum/vendas.api';
import { AberturaDeCaixa } from './AberturaDeCaixa';
import { CabecalhoDoPdv } from './CabecalhoDoPdv';
import { CONSUMIDOR_FINAL, type ClienteDoPdv } from './clienteDoPdv';
import { JanelasDoPdv, type AcoesDasJanelas, type JanelaDoPdv } from './JanelasDoPdv';
import { DetalheDoCaixa, MolduraDoPdv } from './MolduraDoPdv';
import { linhaPesada } from './pesavel';
import { ACOES_DA_GRADE, barraDoPdv, teclasDoPdv } from './teclasDoPdv';
import { useCaixa } from './useCaixa';

/** Vendas › Venda PDV NFC-e e Venda PDV Balcão: o PDV no desenho do Nutri
 *  Prime. O mesmo caixa, a mesma grade e as mesmas teclas; no NFC-e a venda
 *  emite o cupom fiscal, no Balcão sai o pedido de venda sem valor fiscal. */

const TITULO = { NFCE: 'Venda PDV NFC-e', BALCAO: 'Venda PDV Balcão' } as const;
const PRODUTOS: JanelaDoPdv = { tipo: 'produtos', lista: { tipo: 'busca', termo: '' } };

export function PdvScreen({
  modo,
  emJanela = false,
}: {
  readonly modo: 'NFCE' | 'BALCAO';
  /** Abre como janela por cima do sistema; Esc ou Sair volta para onde estava. */
  readonly emJanela?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { filiais, filial, filialId, escolher: escolherFilial, erro: erroDaFilial } = useFilial();
  const { caixa, setCaixa, fechamento, recarregar, fechado, aberto } = useCaixa(filialId);
  const venda = useVendaEmAndamento(`synapse:pdv:${modo}:itens`);
  const lancamento = useRef<ControleDoLancamento>(null);
  const [cliente, setCliente] = useGuardado<ClienteDoPdv>(
    `synapse:pdv:${modo}:cliente`,
    CONSUMIDOR_FINAL,
  );
  const [vendedor, setVendedor] = useState<VendedorNaLista | null>(null);
  const [mesaOuCartao, setMesaOuCartao] = useGuardado<string | null>(
    `synapse:pdv:${modo}:mesa`,
    null,
  );
  const [janela, setJanela] = useState<JanelaDoPdv | null>(null);
  const [ultima, setUltima] = useState<PosSale | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { linhaSelecionada: linha } = venda;

  const avisarFalha = (falha: unknown, padrao: string) =>
    setAviso(falha instanceof Error ? falha.message : padrao);

  const fechar = () => {
    setJanela(null);
    lancamento.current?.focarProduto();
  };

  const gaveta = () => {
    acionarGaveta()
      .then(() => setAviso('Gaveta aberta'))
      .catch((falha: unknown) => avisarFalha(falha, 'Não foi possível abrir a gaveta'));
  };

  const limparVenda = () => {
    if (venda.linhas.length && !window.confirm('Limpar a venda? Os itens lançados saem.')) return;
    venda.limpar();
    lancamento.current?.limpar();
    setCliente(CONSUMIDOR_FINAL);
    setMesaOuCartao(null);
    setAviso(null);
    lancamento.current?.focarProduto();
  };

  const finalizar = () => {
    if (!venda.linhas.length) setAviso('Lance ao menos um produto para finalizar');
    else setJanela({ tipo: 'finalizar' });
  };

  const abrirSimilar = () => {
    const atual = lancamento.current?.produtoAtual() ?? null;
    const base = atual
      ? { categoriaId: atual.categoryId, id: atual.id, nome: atual.name }
      : linha && { categoriaId: linha.categoriaId, id: linha.productId, nome: linha.descricao };
    if (!base?.categoriaId) {
      setAviso('Escolha um produto com categoria para ver os similares');
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

  const acoesDaGrade: Readonly<Record<AcaoDaGrade, () => void>> = {
    alterar: () => linha && lancamento.current?.alterar(linha),
    excluir: () => linha && venda.excluir(linha.chave),
    copiar: () => linha && venda.copiar(linha.chave),
    desconto: () => setJanela({ tipo: 'desconto' }),
    produto: () => setJanela(PRODUTOS),
    similar: abrirSimilar,
    sugestao: () =>
      cliente.customerId
        ? setJanela({
            tipo: 'produtos',
            lista: { tipo: 'sugestao', customerId: cliente.customerId, cliente: cliente.nome },
          })
        : setAviso('Informe um cliente do cadastro (F10) para ver as sugestões'),
    lote: () => linha && setJanela({ tipo: 'lote' }),
    serie: () => linha && setJanela({ tipo: 'serie' }),
  };

  const acoes: AcoesDasJanelas = {
    fechar,
    abrir: setJanela,
    escolherProduto: (produto: Product) => {
      setJanela(null);
      lancamento.current?.definirProduto(produto);
    },
    informarCliente: (escolhido) => {
      setCliente(escolhido);
      fechar();
    },
    informarMesa: (mesa) => {
      setMesaOuCartao(mesa);
      fechar();
    },
    lancar: (nova) => {
      venda.lancar(nova, null);
      fechar();
    },
    concluir: (concluida) => {
      setUltima(concluida);
      venda.limpar();
      lancamento.current?.limpar();
      setCliente(CONSUMIDOR_FINAL);
      setMesaOuCartao(null);
      setJanela({ tipo: 'concluida', venda: concluida });
      void recarregar();
      if (concluida.payments.some((pagamento) => pagamento.method === 'CASH'))
        abrirGavetaSeLembrada().catch(() => undefined);
    },
    imprimir: (alvo) => setJanela({ tipo: 'impressao', vendaId: alvo.id }),
    reimprimir: (alvo) => {
      if (!alvo.nfceDocumentId) {
        setJanela({ tipo: 'impressao', vendaId: alvo.id });
        return;
      }
      fechar();
      abrirDanfe(alvo.nfceDocumentId).catch((falha: unknown) =>
        avisarFalha(falha, 'Não foi possível abrir a NFC-e'),
      );
    },
    copiar: (alvo) => {
      if (!filialId) return;
      fechar();
      repetirItens(alvo.items.map(daVenda), { filialId, customerId: cliente.customerId })
        .then((copiadas) => {
          venda.substituirTodas([...venda.linhas, ...copiadas]);
          setAviso(`Itens da venda ${alvo.numero} copiados com o preço de hoje`);
        })
        .catch((falha: unknown) => avisarFalha(falha, 'Não foi possível copiar a venda'));
    },
    atualizarCaixa: setCaixa,
    caixaFechado: (resultado) => {
      setJanela(null);
      fechado(resultado);
    },
    vendaCancelada: () => void recarregar(),
    acionarGaveta: gaveta,
  };

  const lancarEtiqueta = (codigo: string) => {
    if (!filialId) return false;
    linhaPesada({ codigo, pesoMilesimos: null, filialId, customerId: cliente.customerId })
      .then((nova) => venda.lancar(nova, null))
      .catch((falha: unknown) => avisarFalha(falha, 'Etiqueta de balança não reconhecida'));
    return true;
  };

  const comandos = {
    abrir: setJanela,
    limparVenda,
    finalizar,
    gaveta,
    focarQuantidade: () => lancamento.current?.focarQuantidade(),
  };
  const barra = barraDoPdv(comandos, venda.linhas.length > 0);
  useAtalhosDaTela(teclasDoPdv(barra, comandos), Boolean(caixa) && !janela);

  // A venda abre com o cursor no produto, pronta para o leitor.
  const caixaId = caixa?.id;
  useEffect(() => {
    if (caixaId) lancamento.current?.focarProduto();
  }, [caixaId]);

  /** Sair da janela não perde nada: itens, cliente e mesa ficam guardados e o
   *  caixa continua aberto. */
  const sair = () => {
    if (location.key === 'default') navigate(ROTAS.inicio);
    else navigate(-1);
  };
  const moldura = { emJanela, titulo: TITULO[modo], aoFechar: sair };

  if (!filialId || !filial || caixa === undefined) {
    return (
      <MolduraDoPdv {...moldura}>
        <SemFilial
          carregando={filiais === null || (Boolean(filialId) && caixa === undefined)}
          erro={erroDaFilial}
        />
      </MolduraDoPdv>
    );
  }
  if (caixa === null) {
    return (
      <MolduraDoPdv {...moldura}>
        <AberturaDeCaixa
          titulo={TITULO[modo]}
          filiais={filiais ?? []}
          filialId={filialId}
          aoEscolherFilial={escolherFilial}
          fechamento={fechamento}
          aoAbrir={aberto}
        />
      </MolduraDoPdv>
    );
  }

  return (
    <MolduraDoPdv {...moldura} detalhe={<DetalheDoCaixa filial={filial.name} caixa={caixa} />}>
      <CabecalhoDoPdv
        ultima={ultima}
        cliente={cliente}
        vendedor={vendedor}
        mesaOuCartao={mesaOuCartao}
        chaveDoVendedor={`synapse:pdv:${modo}:vendedor`}
        aoMudarVendedor={setVendedor}
        aoInformarCliente={() => setJanela({ tipo: 'cliente' })}
        aoInformarMesa={() => setJanela({ tipo: 'mesa' })}
      />

      <LancamentoDeItem
        ref={lancamento}
        filialId={filialId}
        customerId={cliente.customerId}
        lancarAoLerCodigo
        aoLancar={venda.lancar}
        aoBuscar={(termo) => setJanela({ tipo: 'produtos', lista: { tipo: 'busca', termo } })}
        aoEtiquetaDeBalanca={lancarEtiqueta}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <BotoesDaGrade
          acoes={ACOES_DA_GRADE}
          temLinha={Boolean(linha)}
          temItens={venda.linhas.length > 0}
          aoAcionar={(acao) => {
            setAviso(null);
            acoesDaGrade[acao]();
          }}
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
        rotuloDoCodigo="Referência"
        vazio="Caixa livre. Leia o código de barras do produto."
      />

      <PainelDeTotais totais={venda.totais} />

      <BarraDeAtalhos atalhos={barra} />

      <JanelasDoPdv
        janela={janela}
        modo={modo}
        caixa={caixa}
        filialId={filialId}
        venda={venda}
        cliente={cliente}
        vendedor={vendedor}
        mesaOuCartao={mesaOuCartao}
        ultima={ultima}
        acoes={acoes}
      />
    </MolduraDoPdv>
  );
}

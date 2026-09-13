/** Carga de exemplo da tela de Analise de Credito.
 *
 *  Sem dado nenhum a tela abre vazia e nao da para conferir nada: aqui ficam
 *  tres clientes com historia diferente — um bom pagador, um com atraso e um
 *  novo — cada um com pedidos esperando analise, notas emitidas, titulos em
 *  aberto e pagamentos ja feitos.
 *
 *  Idempotente: ids fixos e `set` com merge, entao rodar de novo nao duplica. */

const DIA = 86_400_000;

const dia = (deslocamento) => new Date(Date.now() + deslocamento * DIA).toISOString().slice(0, 10);
const instante = (deslocamento) => new Date(Date.now() + deslocamento * DIA).toISOString();

const item = (productId, descricao, unidades, precoUnitarioCentavos) => ({
  productId,
  descricao,
  quantidade: unidades * 1000,
  precoUnitarioCentavos,
  descontoCentavos: 0,
  totalCentavos: unidades * precoUnitarioCentavos,
});

const pedido = (tenantId, cliente, dados) => {
  const itens = dados.itens;
  return {
    id: dados.id,
    numero: dados.numero,
    tenantId,
    branchId: 'filial-dev',
    customerId: cliente.id,
    clienteNome: cliente.nome,
    clienteDocumento: cliente.documento,
    clienteCidade: cliente.cidade,
    clienteBairro: cliente.bairro,
    tipo: dados.tipo ?? 'VENDA',
    situacao: dados.situacao ?? 'AGUARDANDO_ANALISE',
    origem: dados.origem ?? 'MOBILE',
    vendedorId: dados.vendedorId ?? 'vendedor-dev',
    vendedorNome: dados.vendedorNome ?? 'Marcos Vendas',
    condicaoDePagamento: dados.condicao ?? '28/35/42 dias',
    prazoMedioEmDias: dados.prazo ?? 35,
    formaDePagamento: dados.forma ?? 'Boleto',
    totalCentavos: itens.reduce((soma, linha) => soma + linha.totalCentavos, 0),
    descontoCentavos: 0,
    itens,
    observacao: dados.observacao ?? null,
    nota: dados.nota ?? null,
    enviadoEm: dados.enviadoEm,
    analisadoEm: null,
    analisadoPor: null,
  };
};

const titulo = (tenantId, cliente, dados) => ({
  id: dados.id,
  tenantId,
  branchId: 'filial-dev',
  tipo: 'RECEBER',
  descricao: dados.descricao,
  customerId: cliente.id,
  fornecedorId: null,
  orderId: dados.orderId ?? null,
  numeroParcela: dados.parcela ?? 1,
  totalDeParcelas: dados.totalDeParcelas ?? 1,
  valorOriginalCentavos: dados.valorCentavos,
  vencimento: dados.vencimento,
  status: dados.liquidacoes?.length ? 'QUITADO' : 'ABERTO',
  liquidacoes: (dados.liquidacoes ?? []).map((liquidacao, indice) => ({
    id: `${dados.id}-L${indice + 1}`,
    data: liquidacao.data,
    valorCentavos: liquidacao.valorCentavos ?? dados.valorCentavos,
    forma: liquidacao.forma ?? 'PIX',
    observacao: null,
    referenciaBancaria: null,
    registradoPor: 'seed-dev',
    registradoEm: `${liquidacao.data}T12:00:00.000Z`,
  })),
  centroDeCustoId: null,
  categoriaId: null,
  renegociadoDe: null,
  renegociadoPara: [],
  criadoEm: instante(-90),
  criadoPor: 'seed-dev',
});

const CLIENTES = [
  {
    id: 'cliente-dev-1',
    nome: 'Mercado do Bairro',
    documento: '12345678000190',
    cidade: 'Goiânia',
    bairro: 'Setor Bueno',
  },
  {
    id: 'cliente-dev-2',
    nome: 'Padaria Estrela',
    documento: '98765432000110',
    cidade: 'Aparecida de Goiânia',
    bairro: 'Garavelo',
  },
  {
    id: 'cliente-dev-3',
    nome: 'Atacado Sul',
    documento: '45678912000133',
    cidade: 'Anápolis',
    bairro: 'Jundiaí',
  },
];

const pedidosDe = (tenantId) => {
  const [mercado, padaria, atacado] = CLIENTES;
  return [
    pedido(tenantId, mercado, {
      id: 'pedido-dev-101',
      numero: 101,
      enviadoEm: instante(-0.2),
      condicao: '28/35/42 dias',
      prazo: 35,
      itens: [
        item('produto-dev-1', 'Arroz tipo 1 5kg (fardo)', 40, 12_990),
        item('produto-dev-2', 'Feijao carioca 1kg', 120, 749),
      ],
    }),
    pedido(tenantId, mercado, {
      id: 'pedido-dev-102',
      numero: 102,
      tipo: 'BONIFICACAO',
      origem: 'DESKTOP',
      condicao: 'Sem cobranca',
      prazo: 0,
      forma: 'Bonificacao',
      enviadoEm: instante(-0.5),
      observacao: 'Acordo de ponta de gondola combinado com o comprador.',
      itens: [item('produto-dev-3', 'Oleo de soja 900ml', 24, 689)],
    }),
    pedido(tenantId, mercado, {
      id: 'pedido-dev-090',
      numero: 90,
      situacao: 'FATURADO',
      enviadoEm: instante(-32),
      nota: { numero: 4412, serie: 1, chaveDeAcesso: null, emitidaEm: instante(-31) },
      itens: [item('produto-dev-1', 'Arroz tipo 1 5kg (fardo)', 30, 12_990)],
    }),
    pedido(tenantId, mercado, {
      id: 'pedido-dev-080',
      numero: 80,
      situacao: 'FATURADO',
      enviadoEm: instante(-62),
      nota: { numero: 4310, serie: 1, chaveDeAcesso: null, emitidaEm: instante(-61) },
      itens: [item('produto-dev-2', 'Feijao carioca 1kg', 200, 749)],
    }),
    pedido(tenantId, padaria, {
      id: 'pedido-dev-103',
      numero: 103,
      tipo: 'TROCA',
      origem: 'MOBILE',
      condicao: 'Troca de mercadoria',
      prazo: 0,
      forma: 'Troca',
      enviadoEm: instante(-1.1),
      observacao: 'Troca de fardo avariado no transporte.',
      itens: [item('produto-dev-4', 'Farinha de trigo 5kg', 10, 2_290)],
    }),
    pedido(tenantId, padaria, {
      id: 'pedido-dev-095',
      numero: 95,
      situacao: 'FATURADO',
      enviadoEm: instante(-21),
      nota: { numero: 4388, serie: 1, chaveDeAcesso: null, emitidaEm: instante(-20) },
      itens: [item('produto-dev-4', 'Farinha de trigo 5kg', 60, 2_290)],
    }),
    pedido(tenantId, atacado, {
      id: 'pedido-dev-104',
      numero: 104,
      origem: 'DESKTOP',
      condicao: '60 dias',
      prazo: 60,
      vendedorNome: 'Rita Campos',
      enviadoEm: instante(-2.4),
      itens: [
        item('produto-dev-5', 'Acucar refinado 1kg', 400, 429),
        item('produto-dev-6', 'Cafe torrado 500g', 150, 1_890),
      ],
    }),
  ];
};

const titulosDe = (tenantId) => {
  const [mercado, padaria, atacado] = CLIENTES;
  return [
    titulo(tenantId, mercado, {
      id: 'titulo-dev-1',
      descricao: 'NF 4412 parcela 1/3',
      orderId: 'pedido-dev-090',
      parcela: 1,
      totalDeParcelas: 3,
      valorCentavos: 129_900,
      vencimento: dia(-12),
    }),
    titulo(tenantId, mercado, {
      id: 'titulo-dev-2',
      descricao: 'NF 4412 parcela 2/3',
      orderId: 'pedido-dev-090',
      parcela: 2,
      totalDeParcelas: 3,
      valorCentavos: 129_900,
      vencimento: dia(5),
    }),
    titulo(tenantId, mercado, {
      id: 'titulo-dev-3',
      descricao: 'NF 4412 parcela 3/3',
      orderId: 'pedido-dev-090',
      parcela: 3,
      totalDeParcelas: 3,
      valorCentavos: 129_900,
      vencimento: dia(19),
    }),
    titulo(tenantId, mercado, {
      id: 'titulo-dev-4',
      descricao: 'NF 4310 parcela 1/2',
      orderId: 'pedido-dev-080',
      parcela: 1,
      totalDeParcelas: 2,
      valorCentavos: 74_900,
      vencimento: dia(-45),
      liquidacoes: [{ data: dia(-45), forma: 'BOLETO' }],
    }),
    titulo(tenantId, mercado, {
      id: 'titulo-dev-5',
      descricao: 'NF 4310 parcela 2/2',
      orderId: 'pedido-dev-080',
      parcela: 2,
      totalDeParcelas: 2,
      valorCentavos: 74_900,
      vencimento: dia(-30),
      liquidacoes: [{ data: dia(-33), forma: 'PIX' }],
    }),
    titulo(tenantId, padaria, {
      id: 'titulo-dev-6',
      descricao: 'NF 4388 parcela 1/1',
      orderId: 'pedido-dev-095',
      valorCentavos: 137_400,
      vencimento: dia(-8),
      liquidacoes: [{ data: dia(-8), forma: 'PIX' }],
    }),
    titulo(tenantId, padaria, {
      id: 'titulo-dev-7',
      descricao: 'NF 4301 parcela 1/1',
      valorCentavos: 52_000,
      vencimento: dia(-60),
      liquidacoes: [{ data: dia(-66), forma: 'TRANSFERENCIA' }],
    }),
    titulo(tenantId, atacado, {
      id: 'titulo-dev-8',
      descricao: 'NF 4190 parcela 1/2',
      valorCentavos: 248_000,
      vencimento: dia(-73),
    }),
    titulo(tenantId, atacado, {
      id: 'titulo-dev-9',
      descricao: 'NF 4190 parcela 2/2',
      valorCentavos: 248_000,
      vencimento: dia(-43),
      liquidacoes: [{ data: dia(-20), valorCentavos: 100_000, forma: 'DINHEIRO' }],
    }),
  ];
};

/** Grava a carga. `db` e o Firestore ja apontado para o emulador. */
export const semearAnaliseDeCredito = async (db, tenantId) => {
  const pedidos = pedidosDe(tenantId);
  const titulos = titulosDe(tenantId);
  const lote = db.batch();

  for (const registro of pedidos) {
    lote.set(db.doc(`tenants/${tenantId}/pedidosDeVenda/${registro.id}`), registro, {
      merge: true,
    });
  }
  for (const registro of titulos) {
    lote.set(db.doc(`tenants/${tenantId}/titulos/${registro.id}`), registro, { merge: true });
  }
  // O contador nao pode ficar atras dos pedidos semeados: o proximo pedido de
  // verdade precisa continuar a numeracao, e nao repetir um numero existente.
  lote.set(db.doc(`tenants/${tenantId}/contadores/pedidosDeVenda`), {
    ultimo: Math.max(...pedidos.map((registro) => registro.numero)),
  });

  await lote.commit();
  return { pedidos: pedidos.length, titulos: titulos.length, clientes: CLIENTES.length };
};

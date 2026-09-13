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

/** Quem mexeu em cada etapa, para o historico ter nome e sobrenome. */
const PESSOAS = {
  GERENCIA_COMERCIAL: { uid: 'gerente-dev', nome: 'Paulo Gerência' },
  CREDITO: { uid: 'credito-dev', nome: 'Carla Crédito' },
  FATURAMENTO: { uid: 'faturamento-dev', nome: 'Fernanda Faturamento' },
  EXPEDICAO: { uid: 'expedicao-dev', nome: 'Jorge Expedição' },
};

const depois = (iso, horas) => new Date(Date.parse(iso) + horas * 3_600_000).toISOString();

const ev = (tipo, etapa, pessoa, em, detalhe = null) => ({
  tipo,
  etapa,
  em,
  porUid: pessoa.uid,
  porNome: pessoa.nome,
  detalhe,
});

const obs = (id, etapa, pessoa, em, texto) => ({
  id,
  etapa,
  texto,
  em,
  porUid: pessoa.uid,
  porNome: pessoa.nome,
});

/** "14/21/28/35" vira [14, 21, 28, 35]; "3x" vira tres parcelas de 30 dias. */
const diasDaCondicao = (condicao) => {
  const vezes = /(\d+)\s*x/i.exec(condicao);
  if (vezes) return Array.from({ length: Number(vezes[1]) }, (_, i) => 30 * (i + 1));
  const numeros = condicao.match(/\d+/g)?.map(Number) ?? [];
  return numeros.length ? numeros : [0];
};

/** Historico coerente com a situacao: pedido faturado passou por credito,
 *  faturamento e entrega; pedido na fila so foi lancado (e as vezes editado). */
const historicoDe = (dados, vendedor) => {
  const inicio = dados.enviadoEm;
  const lancado = ev(
    'LANCADO',
    'VENDEDOR',
    vendedor,
    inicio,
    `Enviado pelo ${dados.origem ?? 'MOBILE'}`,
  );
  const editado = ev(
    'EDITADO',
    'GERENCIA_COMERCIAL',
    PESSOAS.GERENCIA_COMERCIAL,
    depois(inicio, 0.6),
    'Quantidade ajustada e desconto revisado',
  );
  if ((dados.situacao ?? 'AGUARDANDO_ANALISE') !== 'FATURADO') {
    return dados.editado ? [lancado, editado] : [lancado];
  }
  return [
    lancado,
    editado,
    ev('LIBERADO', 'CREDITO', PESSOAS.CREDITO, depois(inicio, 2), 'Liberado na análise de crédito'),
    ev('IMPRESSO', 'FATURAMENTO', PESSOAS.FATURAMENTO, depois(inicio, 3)),
    ev(
      'FATURADO',
      'FATURAMENTO',
      PESSOAS.FATURAMENTO,
      depois(inicio, 20),
      `NF ${dados.nota?.numero} série ${dados.nota?.serie}`,
    ),
    ev(
      'EM_ROTA',
      'EXPEDICAO',
      PESSOAS.EXPEDICAO,
      depois(inicio, 26),
      'Rota Centro-Sul · Caminhão 02',
    ),
    ev(
      'ENTREGUE',
      'EXPEDICAO',
      PESSOAS.EXPEDICAO,
      depois(inicio, 31),
      'Recebido por João (conferente)',
    ),
  ];
};

const observacoesDe = (dados, vendedor) => {
  const lista = [];
  if (dados.observacao) {
    lista.push(obs(`${dados.id}-o1`, 'VENDEDOR', vendedor, dados.enviadoEm, dados.observacao));
  }
  for (const [indice, extra] of (dados.notas ?? []).entries()) {
    lista.push(
      obs(
        `${dados.id}-o${indice + 2}`,
        extra.etapa,
        PESSOAS[extra.etapa] ?? vendedor,
        depois(dados.enviadoEm, extra.horas ?? 1),
        extra.texto,
      ),
    );
  }
  return lista;
};

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
  const vendedor = {
    uid: dados.vendedorId ?? 'vendedor-dev',
    nome: dados.vendedorNome ?? 'Marcos Vendas',
  };
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
    vencimentosEmDias: diasDaCondicao(dados.condicao ?? '28/35/42 dias'),
    prazoMedioEmDias: dados.prazo ?? 35,
    formaDePagamento: dados.forma ?? 'Boleto',
    totalCentavos: itens.reduce((soma, linha) => soma + linha.totalCentavos, 0),
    descontoCentavos: 0,
    itens,
    observacao: dados.observacao ?? null,
    impressoPor: [],
    historico: historicoDe(dados, vendedor),
    observacoes: observacoesDe(dados, vendedor),
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
      editado: true,
      observacao: 'Cliente pediu entrega até sexta, antes das 10h.',
      notas: [
        {
          etapa: 'GERENCIA_COMERCIAL',
          horas: 0.7,
          texto: 'Desconto de 3% autorizado — cliente fechou volume do mês.',
        },
      ],
      condicao: '14/21/28/35',
      prazo: 24,
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
      condicao: 'Sem cobrança',
      prazo: 0,
      forma: 'Bonificação',
      enviadoEm: instante(-0.5),
      observacao: 'Acordo de ponta de gondola combinado com o comprador.',
      itens: [item('produto-dev-3', 'Oleo de soja 900ml', 24, 689)],
    }),
    pedido(tenantId, mercado, {
      id: 'pedido-dev-090',
      numero: 90,
      situacao: 'FATURADO',
      observacao: 'Descarregar pela doca lateral.',
      notas: [
        {
          etapa: 'CREDITO',
          horas: 2,
          texto:
            'Liberado com 12 dias de atraso na parcela anterior — combinado com o financeiro do cliente.',
        },
        { etapa: 'EXPEDICAO', horas: 31, texto: 'Entregue completo; canhoto assinado.' },
      ],
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
      condicao: 'Sem cobrança',
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
    pedido(tenantId, padaria, {
      id: 'pedido-dev-105',
      numero: 105,
      origem: 'BALCAO',
      condicao: 'À vista',
      prazo: 0,
      forma: 'PIX',
      vendedorNome: 'Caixa 1',
      enviadoEm: instante(-0.05),
      itens: [item('produto-dev-6', 'Cafe torrado 500g', 24, 1_890)],
    }),
    pedido(tenantId, atacado, {
      id: 'pedido-dev-106',
      numero: 106,
      origem: 'MOBILE',
      condicao: '3x',
      prazo: 60,
      forma: 'Cartão',
      vendedorNome: 'Rita Campos',
      enviadoEm: instante(-0.8),
      itens: [item('produto-dev-5', 'Acucar refinado 1kg', 120, 429)],
    }),
    pedido(tenantId, atacado, {
      id: 'pedido-dev-104',
      numero: 104,
      origem: 'DESKTOP',
      condicao: '14/21',
      prazo: 17,
      forma: 'Cheque',
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

const CADASTROS = {
  'cliente-dev-1': {
    legalName: 'Mercado do Bairro Comércio de Alimentos LTDA',
    stateRegistration: '10.123.456-7',
    phone: '(62) 3241-5566',
    whatsapp: '(62) 99812-4455',
    email: 'compras@mercadodobairro.com.br',
    street: 'Rua T-37',
    number: '1450',
    state: 'GO',
    postalCode: '74230020',
    creditLimit: 1_500_000,
  },
  'cliente-dev-2': {
    legalName: 'Padaria Estrela Panificação LTDA',
    stateRegistration: '10.765.432-1',
    phone: '(62) 3283-9090',
    whatsapp: null,
    email: 'financeiro@padariaestrela.com.br',
    street: 'Avenida Rio Verde',
    number: '220',
    state: 'GO',
    postalCode: '74953010',
    creditLimit: 600_000,
  },
  'cliente-dev-3': {
    legalName: 'Atacado Sul Distribuidora EIRELI',
    stateRegistration: '10.456.789-0',
    phone: '(62) 3324-1122',
    whatsapp: '(62) 98100-7788',
    email: 'contato@atacadosul.com.br',
    street: 'Avenida Brasil Sul',
    number: '3100',
    state: 'GO',
    postalCode: '75113570',
    creditLimit: 2_000_000,
  },
};

const cadastroDe = (tenantId, cliente) => {
  const extra = CADASTROS[cliente.id];
  return {
    id: cliente.id,
    tenantId,
    type: 'PJ',
    name: cliente.nome,
    legalName: extra.legalName,
    taxId: cliente.documento,
    stateRegistration: extra.stateRegistration,
    phone: extra.phone,
    whatsapp: extra.whatsapp,
    email: extra.email,
    address: {
      street: extra.street,
      number: extra.number,
      complement: null,
      district: cliente.bairro,
      city: cliente.cidade,
      state: extra.state,
      postalCode: extra.postalCode,
    },
    creditLimit: extra.creditLimit,
    updatedAt: instante(-40),
    updatedByName: 'Paulo Gerência',
  };
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
  for (const cliente of CLIENTES) {
    lote.set(db.doc(`tenants/${tenantId}/customers/${cliente.id}`), cadastroDe(tenantId, cliente), {
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

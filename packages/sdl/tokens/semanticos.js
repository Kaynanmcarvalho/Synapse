/** Synapse Design Language — semanticos.
 *
 *  Aqui cada valor ganha funcao: `superficie.painel`, `linha.foco`,
 *  `estado.perigo.fundo`. E daqui que a interface fala. Tela que escreve
 *  `#b3242f` ou `blue-600` esta decidindo sozinha uma coisa que e do sistema.
 *
 *  Regra de nome: funcao, nunca cor fisica. `estado.perigo.texto` continua certo
 *  se um dia o vermelho mudar; `vermelho500` vira mentira no mesmo dia. */

import {
  acento,
  azulLegado,
  camada,
  cobalto,
  curva,
  duracao,
  espaco,
  estado as estadoCru,
  externo,
  fonte,
  neutro,
  raio,
  sombra,
  superficie as superficieCrua,
  texto,
} from './primitivos.js';

/** A cor da marca e a unica que muda em tempo de execucao: cada tenant pode ter
 *  a sua. Por isso ela mora numa custom property, em canais RGB — assim o
 *  Tailwind continua podendo aplicar opacidade (`bg-primary/10`).
 *
 *  O padrao e o cobalto do Synapse; sem a variavel definida, o fallback dentro
 *  do `rgb()` garante a mesma cor de hoje. */
export const MARCA = {
  variavel: '--sdl-marca',
  padraoHex: cobalto[600],
  padraoCanais: '73 79 223',
};

/** `rgb(var(--sdl-marca, 73 79 223) / <alpha-value>)` — o placeholder e trocado
 *  pelo Tailwind quando a classe traz opacidade. */
export const corDaMarca = (alfa = '<alpha-value>') =>
  `rgb(var(${MARCA.variavel}, ${MARCA.padraoCanais}) / ${alfa})`;

/** `#494fdf` -> `73 79 223`. Devolve nulo para valor que nao e hex de 3 ou 6
 *  digitos: branding invalido nao pode apagar a marca da tela. */
export const canaisDoHex = (hex) => {
  const limpo = String(hex ?? '')
    .trim()
    .replace(/^#/, '');
  const cheio =
    limpo.length === 3
      ? limpo
          .split('')
          .map((digito) => digito + digito)
          .join('')
      : limpo;
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) return null;
  const numero = Number.parseInt(cheio, 16);
  return `${(numero >> 16) & 255} ${(numero >> 8) & 255} ${numero & 255}`;
};

/** Onde o conteudo se apoia. `tela` e o chao do aplicativo (a chrome e o que
 *  fica ao redor do trabalho); `pagina` e a folha de trabalho em si, sempre um
 *  tom mais clara que `tela` — a diferenca e minima de proposito (perceptivel
 *  por comparacao, nao como bloco isolado), mas e ela que da profundidade sem
 *  precisar de card. `painel` e o cartao que flutua sobre a folha; `afundado`
 *  e o campo dentro do cartao. */
export const superficie = {
  tela: superficieCrua.quaseBrancoFrio,
  pagina: superficieCrua.branco,
  painel: superficieCrua.branco,
  elevado: superficieCrua.branco,
  afundado: superficieCrua.quaseBranco,
  suave: superficieCrua.cinza,
  hover: superficieCrua.cinzaHover,
  pressionado: superficieCrua.cinzaPressionado,
  inversa: superficieCrua.preto,
  inversaSuave: superficieCrua.escuroElevado,
};

/** Texto, do mais forte ao mais apagado. `sutil` (#8d969e) tem contraste 2,9:1
 *  sobre branco: serve para rotulo curto e apoio, nunca para leitura corrida. */
export const conteudo = {
  forte: neutro[900],
  padrao: neutro[800],
  medio: neutro[700],
  apoio: neutro[600],
  fraco: neutro[500],
  sutil: neutro[400],
  desabilitado: neutro[300],
  inverso: superficieCrua.branco,
  naMarca: superficieCrua.branco,
};

/** Linha antes de sombra: e a borda que separa, e nao o volume. */
export const linha = {
  fina: neutro[200],
  media: superficieCrua.cinzaBorda,
  forte: neutro[900],
  foco: corDaMarca('1'),
};

/** A marca. `suave` e o fundo de apoio (selo, chip de icone). */
export const marca = {
  padrao: corDaMarca(),
  brilhante: cobalto[500],
  profunda: cobalto[700],
  suave: estadoCru.marcaFundoSuave,
  sobre: superficieCrua.branco,
};

/** Estados do sistema. Cada um responde as mesmas quatro perguntas: que cor tem
 *  o texto, o fundo, a borda e o pontinho indicador.
 *
 *  `vencido` e `bloqueado` existem porque no ERP eles nao sao "erro": sao
 *  situacao do cliente ou do titulo, e aparecem o dia inteiro na tela. */
const comEstado = (textoCor, fundo, borda, indicador) => ({
  texto: textoCor,
  fundo,
  borda,
  indicador,
});

export const estado = {
  ok: comEstado(
    estadoCru.okTexto,
    estadoCru.okFundo,
    estadoCru.okIndicadorSuave,
    estadoCru.okIndicador,
  ),
  info: comEstado(acento['light-blue'], cobalto[50], cobalto[200], acento.link),
  atencao: comEstado(
    estadoCru.atencaoTexto,
    estadoCru.atencaoFundo,
    acento.warning,
    acento.warning,
  ),
  perigo: comEstado(
    estadoCru.perigoTexto,
    estadoCru.perigoFundo,
    estadoCru.perigoBorda,
    acento.danger,
  ),
  vencido: comEstado(
    estadoCru.perigoTexto,
    estadoCru.perigoFundoSuave,
    estadoCru.perigoBorda,
    estadoCru.perigoTexto,
  ),
  bloqueado: comEstado(
    estadoCru.perigoTextoForte,
    estadoCru.perigoFundo,
    estadoCru.perigoBorda,
    estadoCru.perigoTextoForte,
  ),
  pendente: comEstado(
    estadoCru.atencaoTexto,
    estadoCru.atencaoFundoSuave,
    acento.yellow,
    acento.yellow,
  ),
  neutro: comEstado(neutro[700], superficieCrua.cinza, neutro[200], neutro[400]),
};

/** Densidade. ERP de mesa vive em `compacta`; `confortavel` existe para toque e
 *  para tela de leitura. Alturas de controle e de linha de tabela. */
export const densidade = {
  compacta: { controle: '32px', linha: '30px', respiro: espaco[2] },
  padrao: { controle: '36px', linha: '36px', respiro: espaco[3] },
  confortavel: { controle: '44px', linha: '44px', respiro: espaco[4] },
};

/** Largura util do conteudo. Hoje o ERP disputa 1200, 1400, 1500 e max-w-7xl
 *  para o mesmo papel; estes nomes dizem para que serve cada uma. */
export const largura = {
  estreita: '720px',
  leitura: '960px',
  padrao: '1200px',
  trabalho: '1400px',
  ampla: '1600px',
  cheia: '100%',
};

/** Papeis tipograficos. O nome diz a funcao no texto, e nao o tamanho: quem
 *  escrever `titulo.tela` continua certo se a escala mudar. */
export const tipografia = {
  display: 'display-lg',
  tituloTela: 'heading-md',
  tituloSecao: 'heading-sm',
  tituloCartao: 'body-md',
  corpoGrande: 'body-md',
  corpo: 'body-sm',
  corpoCompacto: 'body-sm',
  acao: 'button-sm',
  rotulo: 'caption',
  dado: 'body-sm',
  legenda: 'caption',
};

export const movimento = {
  duracao,
  curva,
  abrir: { duracao: duracao.normal, curva: curva.entrada },
  fechar: { duracao: duracao.rapido, curva: curva.saida },
  trocar: { duracao: duracao.rapido, curva: curva.padrao },
};

export const camadas = camada;
export const raios = raio;
export const sombras = sombra;
export const fontes = fonte;
export const escalaDeTexto = texto;
export const paletaLegada = { azul: azulLegado, acento, externo };

/** A pilha global de sobreposições abertas — Modal, Drawer, Dialogo, Gaveta,
 *  Janela, todo mundo que fecha com Esc. Sem isto, cada mecânica tinha (ou
 *  não tinha) sua própria contagem: `useOverlay` guardava a dela, e
 *  `useEscParaFechar` não guardava nenhuma. Duas sobreposições de mecânicas
 *  diferentes empilhadas (uma Gaveta e um Dialogo por cima, por exemplo)
 *  nunca se enxergavam — um Escape só fechava a de cima "por acidente", pela
 *  ordem de fase do evento, nunca por garantia real. `stopPropagation` não
 *  ajuda aqui: ele não impede outro listener no MESMO nó (o `document`) e na
 *  MESMA fase de rodar — só `stopImmediatePropagation` faria isso, e nenhuma
 *  sobreposição sabe se existe outra para chamar isso com segurança.
 *
 *  A pilha muda isso: quem abre entra no topo, quem fecha sai, e cada
 *  sobreposição só reage ao Esc quando está realmente no topo — não importa
 *  qual mecânica é a de baixo. */

export type MarcaDeSobreposicao = symbol;

const abertas: MarcaDeSobreposicao[] = [];

/** Registra uma sobreposição no topo da pilha. Devolve a marca (para
 *  perguntar depois "estou no topo?") e a função de saída, que deve rodar no
 *  cleanup do efeito que chamou isto — nunca antes. */
export const registrarSobreposicao = (): {
  readonly marca: MarcaDeSobreposicao;
  readonly sair: () => void;
} => {
  const marca: MarcaDeSobreposicao = Symbol('sobreposicao');
  abertas.push(marca);
  return {
    marca,
    sair: () => {
      const indice = abertas.lastIndexOf(marca);
      if (indice >= 0) abertas.splice(indice, 1);
    },
  };
};

/** Só true para a sobreposição mais recente ainda aberta — a que está
 *  visualmente por cima, sempre (novas entram no fim, então o fim é o topo). */
export const estaNoTopoDaPilha = (marca: MarcaDeSobreposicao): boolean =>
  abertas[abertas.length - 1] === marca;

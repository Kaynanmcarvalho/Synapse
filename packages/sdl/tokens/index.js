/** Synapse Design Language — tokens.
 *
 *  Uma fonte de verdade para as decisoes visuais do produto. O Tailwind monta o
 *  tema a partir daqui (`tailwind.preset.js`), e o codigo da aplicacao importa
 *  daqui quando precisa do valor em JavaScript (por exemplo, para converter a
 *  cor de marca do tenant em canais RGB).
 *
 *  Nao ha etapa de build de proposito: `tailwind.config.cjs` precisa ler estes
 *  arquivos com `require()`, e depender de `dist` construido deixaria o tema
 *  quebrado enquanto o pacote nao compilasse. */

export * as primitivos from './primitivos.js';
export * as semanticos from './semanticos.js';
export { MARCA, canaisDoHex, corDaMarca } from './semanticos.js';

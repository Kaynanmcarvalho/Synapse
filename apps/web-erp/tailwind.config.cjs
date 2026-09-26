/* CommonJS de proposito: o Tailwind recarrega uma config .cjs a cada alteracao.
 * Em ESM o Node guarda o arquivo no cache de modulos, que o Tailwind nao
 * consegue limpar, e a mudanca so aparece depois de reiniciar o servidor.
 * O preset continua em ESM — `require` de ESM funciona e devolve o namespace. */
const presetModule = require('@synapse/sdl/tailwind.preset.js');
const preset = presetModule.default ?? presetModule;

/** O tema da retaguarda vem inteiro do Synapse Design Language (packages/sdl):
 *  paleta, escala de texto, raios, sombras, camadas e movimento moram nos tokens,
 *  num lugar so, e o preset os traduz para o Tailwind.
 *
 *  Aqui fica so o que e deste app: onde procurar classe. Valor visual nenhum e
 *  decidido neste arquivo — se precisar de um, ele nasce token. */
module.exports = {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};

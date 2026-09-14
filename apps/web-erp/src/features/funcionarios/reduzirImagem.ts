/** Reduz a foto para caber no maior lado `limite` e devolve JPEG. Foto de
 *  celular tem 4000px e vários megas; a ficha precisa de uma miniatura nítida. */
export const reduzirImagem = async (arquivo: Blob, limite: number): Promise<Blob> => {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, limite / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext('2d');
  if (!contexto) throw new Error('O navegador não conseguiu preparar a imagem');
  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  const reduzida = await new Promise<Blob | null>((resolver) =>
    tela.toBlob(resolver, 'image/jpeg', 0.85),
  );
  if (!reduzida) throw new Error('O navegador não conseguiu converter a imagem');
  return reduzida;
};

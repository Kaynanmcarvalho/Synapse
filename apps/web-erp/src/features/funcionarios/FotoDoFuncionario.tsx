/* eslint-disable max-lines-per-function */
import { ImagePlus, LoaderCircle, Trash2, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BOTAO_CLARO } from '../cadastros/comum/estilos';
import { enviarFoto, lerFoto, removerFoto } from './funcionarios.api';
import { reduzirImagem } from './reduzirImagem';

/** O quadro da foto com (Buscar Foto) e (Limpar Foto). A imagem é reduzida no
 *  navegador antes de subir — foto de celular tem vários megas e a API guarda
 *  até 700 KB. Só existe depois de salvar a ficha: a foto é do funcionário. */
export function FotoDoFuncionario({
  funcionarioId,
  temFoto,
}: {
  readonly funcionarioId: string | null;
  readonly temFoto: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [imagem, setImagem] = useState<string | null>(null);
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setImagem(null);
    if (!funcionarioId || !temFoto) return undefined;
    lerFoto(funcionarioId)
      .then((foto) => ativo && setImagem(`data:${foto.tipo};base64,${foto.base64}`))
      .catch(() => ativo && setImagem(null));
    return () => {
      ativo = false;
    };
  }, [funcionarioId, temFoto]);

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo || !funcionarioId) return;
    setTrabalhando(true);
    setErro(null);
    try {
      const reduzida = await reduzirImagem(arquivo, 640);
      await enviarFoto(funcionarioId, reduzida);
      setImagem(URL.createObjectURL(reduzida));
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar a foto');
    } finally {
      setTrabalhando(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const limpar = async () => {
    if (!funcionarioId) return;
    setTrabalhando(true);
    setErro(null);
    try {
      await removerFoto(funcionarioId);
      setImagem(null);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível limpar a foto');
    } finally {
      setTrabalhando(false);
    }
  };

  return (
    <section className="border-hairline-light shadow-cartao rounded-2xl border bg-white p-4">
      <div className="bg-surface-soft border-hairline-light flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border">
        {trabalhando ? (
          <LoaderCircle size={22} className="text-stone animate-spin" aria-hidden="true" />
        ) : imagem ? (
          <img src={imagem} alt="Foto do funcionário" className="h-full w-full object-cover" />
        ) : (
          <span className="text-stone flex flex-col items-center gap-2">
            <UserRound size={40} aria-hidden="true" />
            <span className="text-caption">Foto</span>
          </span>
        )}
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(evento) => void escolher(evento.target.files?.[0])}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={!funcionarioId || trabalhando}
          className={`${BOTAO_CLARO} justify-center`}
        >
          <ImagePlus size={15} aria-hidden="true" /> Buscar Foto
        </button>
        <button
          type="button"
          onClick={() => void limpar()}
          disabled={!funcionarioId || !imagem || trabalhando}
          className={`${BOTAO_CLARO} justify-center`}
        >
          <Trash2 size={15} aria-hidden="true" /> Limpar Foto
        </button>
      </div>
      <p className="text-caption text-stone mt-2">
        {funcionarioId
          ? 'JPG, PNG ou WEBP. A imagem é reduzida antes de enviar.'
          : 'Salve o cadastro para incluir a foto.'}
      </p>
      {erro ? <p className="text-caption mt-1 text-[#b3242f]">{erro}</p> : null}
    </section>
  );
}

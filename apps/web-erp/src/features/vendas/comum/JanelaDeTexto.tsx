import { Modal } from '@synapse/ui';
import { useEffect, useId, useRef, useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, INPUT_DE_BUSCA } from '../../cadastros/comum/estilos';

/** Uma pergunta só, confirmada com Enter: Lote, Série, Mesa/Cartão, motivo. */
export function JanelaDeTexto({
  titulo,
  rotulo,
  descricao,
  valorInicial = '',
  maximo = 60,
  minimo = 0,
  permiteVazio = true,
  aoConfirmar,
  aoFechar,
}: {
  readonly titulo: string;
  readonly rotulo: string;
  readonly descricao?: string;
  readonly valorInicial?: string;
  readonly maximo?: number;
  readonly minimo?: number;
  readonly permiteVazio?: boolean;
  readonly aoConfirmar: (valor: string) => void;
  readonly aoFechar: () => void;
}) {
  const id = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState(valorInicial);
  const limpo = valor.trim();
  const valido = (permiteVazio && limpo === '') || limpo.length >= Math.max(minimo, 1);

  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
  }, []);

  const confirmar = () => {
    if (valido) aoConfirmar(limpo);
  };

  return (
    <Modal
      onClose={aoFechar}
      title={titulo}
      description={descricao}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
            (Esc) Cancelar
          </button>
          <button type="button" onClick={confirmar} disabled={!valido} className={BOTAO_ESCURO}>
            (Enter) Confirmar
          </button>
        </div>
      }
    >
      <label htmlFor={id} className="text-caption text-charcoal mb-1.5 block font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        ref={campo}
        value={valor}
        maxLength={maximo}
        onChange={(evento) => setValor(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault();
            confirmar();
          }
        }}
        className={INPUT_DE_BUSCA}
      />
      {minimo > 0 ? (
        <p className="text-caption text-stone mt-1.5">
          {limpo.length}/{minimo} caracteres no mínimo
        </p>
      ) : null}
    </Modal>
  );
}

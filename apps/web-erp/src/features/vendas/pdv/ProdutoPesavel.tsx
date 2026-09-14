/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, INPUT_DE_BUSCA } from '../../cadastros/comum/estilos';
import { lerEtiquetaDeBalanca } from '../comum/balanca';
import { lerQuantidade, type LinhaDaVenda } from '../comum/itens';
import { linhaPesada } from './pesavel';

/** F7 Produto Pesável: o código do produto e o peso lido na balança, ou a
 *  etiqueta da balança inteira no campo do código (o peso vem nela). */
export function ProdutoPesavel({
  filialId,
  customerId,
  aoLancar,
  aoFechar,
}: {
  readonly filialId: string;
  readonly customerId: string | null;
  readonly aoLancar: (linha: LinhaDaVenda) => void;
  readonly aoFechar: () => void;
}) {
  const ids = { codigo: useId(), peso: useId() };
  const campoCodigo = useRef<HTMLInputElement>(null);
  const campoPeso = useRef<HTMLInputElement>(null);
  const [codigo, setCodigo] = useState('');
  const [peso, setPeso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const etiqueta = lerEtiquetaDeBalanca(codigo);

  useEffect(() => campoCodigo.current?.focus(), []);

  const lancar = async () => {
    const pesoMilesimos = etiqueta ? null : lerQuantidade(peso);
    if (!codigo.trim()) {
      setErro('Informe o código do produto');
      return;
    }
    if (!etiqueta && !pesoMilesimos) {
      setErro('Informe o peso em kg (ex.: 1,250)');
      campoPeso.current?.focus();
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      aoLancar(await linhaPesada({ codigo, pesoMilesimos, filialId, customerId }));
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível lançar o produto');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      onClose={aoFechar}
      title="Produto Pesável"
      description="Código e peso, ou a etiqueta da balança"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
            (Esc) Cancelar
          </button>
          <button type="submit" form="produto-pesavel" disabled={enviando} className={BOTAO_ESCURO}>
            {enviando ? (
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            ) : null}
            (Enter) Lançar
          </button>
        </div>
      }
    >
      <form
        id="produto-pesavel"
        onSubmit={(evento) => {
          evento.preventDefault();
          void lancar();
        }}
        className="flex flex-col gap-3"
      >
        <div>
          <label htmlFor={ids.codigo} className="text-caption text-charcoal mb-1 block font-medium">
            Código do produto ou etiqueta
          </label>
          <input
            id={ids.codigo}
            ref={campoCodigo}
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' && !lerEtiquetaDeBalanca(codigo)) {
                evento.preventDefault();
                campoPeso.current?.focus();
              }
            }}
            autoComplete="off"
            className={`${INPUT_DE_BUSCA} tabular-nums`}
          />
          {etiqueta ? (
            <p className="text-caption text-stone mt-1">
              Etiqueta da balança: produto {etiqueta.codigoDoProduto}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor={ids.peso} className="text-caption text-charcoal mb-1 block font-medium">
            Peso (kg)
          </label>
          <input
            id={ids.peso}
            ref={campoPeso}
            inputMode="decimal"
            value={etiqueta ? '' : peso}
            disabled={Boolean(etiqueta)}
            onChange={(evento) => setPeso(evento.target.value.replace(/[^\d,]/g, ''))}
            placeholder={etiqueta ? 'Vem da etiqueta' : '0,000'}
            className={`${INPUT_DE_BUSCA} text-right tabular-nums`}
          />
        </div>
        {erro ? <p className="text-caption text-[#b3242f]">{erro}</p> : null}
      </form>
    </Modal>
  );
}

import { Kbd, Text } from '@synapse/sdl';
import { moveuDeVerdade } from '../../app/menu/menu.utils';
import { contextoDoItem } from './menuSearch';
import type { Resultado } from './resultado';

export function LinhaDeResultado({
  id,
  resultado,
  emDestaque,
  onDestacar,
  onEscolher,
}: {
  readonly id: string;
  readonly resultado: Resultado;
  readonly emDestaque: boolean;
  readonly onDestacar: () => void;
  readonly onEscolher: () => void;
}) {
  const principal = resultado.tipo === 'navegacao' ? resultado.item.rotulo : resultado.item.title;
  const contexto =
    resultado.tipo === 'navegacao' ? contextoDoItem(resultado.item) : resultado.item.subtitle;
  const emBreve = resultado.tipo === 'navegacao' && resultado.item.situacao === 'em-breve';
  const atalho = resultado.tipo === 'navegacao' ? resultado.item.atalho?.rotulo : undefined;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus -- padrao combobox: o foco fica sempre no <input> (selecao virtual via aria-activedescendant), a opcao nunca recebe foco de verdade; Enter/teclado sao tratados no campo.
    <div
      id={id}
      role="option"
      aria-selected={emDestaque}
      onMouseMove={(evento) => {
        if (moveuDeVerdade(evento)) onDestacar();
      }}
      onClick={onEscolher}
      className={`rounded-pequeno duration-instantaneo relative grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2 transition-colors ${
        emDestaque ? 'bg-surface-hover' : ''
      }`}
    >
      {/* Superficie + marcador, nunca so a cor (§38): traco de cobalto na
       *  borda, sem virar caixa azul. */}
      {emDestaque && (
        <span
          aria-hidden="true"
          className="bg-primary absolute inset-y-1.5 left-1 w-[2px] rounded-full"
        />
      )}
      <span className="min-w-0">
        <Text as="span" variant="corpo" className="block truncate">
          {principal}
        </Text>
        {contexto && (
          <Text as="span" variant="legenda" tone="apoio" className="block truncate">
            {contexto}
          </Text>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {emBreve && (
          <Text as="span" variant="legenda" tone="apoio">
            em breve
          </Text>
        )}
        {atalho && <Kbd>{atalho}</Kbd>}
      </span>
    </div>
  );
}

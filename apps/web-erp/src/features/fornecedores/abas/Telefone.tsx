import { FaWhatsapp } from 'react-icons/fa';
import { Campo, Texto } from '../../customers/campos';
import { mascararTelefone } from '../../customers/formato';
import { lerCaminho } from '../../cadastros/comum/caminho';
import type { LigacaoDaFicha } from '../../cadastros/comum/CamposDaFicha';

/** Telefone com a marcação de WhatsApp ao lado, como na ficha do Syndata. */
export function Telefone({
  ficha,
  caminho,
  rotulo,
}: {
  readonly ficha: LigacaoDaFicha;
  readonly caminho: string;
  readonly rotulo: string;
}) {
  const numero = String(lerCaminho(ficha.formulario, `${caminho}.numero`) ?? '');
  const whatsapp = lerCaminho(ficha.formulario, `${caminho}.whatsapp`) === true;
  return (
    <Campo rotulo={rotulo} erro={ficha.erros[`${caminho}.numero`]} largura={2}>
      {({ id, invalido }) => (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Texto
              id={id}
              invalido={invalido}
              valor={mascararTelefone(numero)}
              aoMudar={(valor) =>
                ficha.mudar(`${caminho}.numero`, valor.replace(/\D/g, '').slice(0, 11))
              }
              inputMode="tel"
            />
          </div>
          <label
            title="Este número tem WhatsApp"
            className={`flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 transition ${whatsapp ? 'border-[#25d366] bg-[#e9fbf0]' : 'border-hairline-light bg-white'}`}
          >
            <input
              type="checkbox"
              checked={whatsapp}
              onChange={(evento) => ficha.mudar(`${caminho}.whatsapp`, evento.target.checked)}
              className="h-4 w-4"
            />
            <FaWhatsapp size={16} className="text-[#25d366]" aria-hidden="true" />
            <span className="sr-only">WhatsApp</span>
          </label>
        </div>
      )}
    </Campo>
  );
}

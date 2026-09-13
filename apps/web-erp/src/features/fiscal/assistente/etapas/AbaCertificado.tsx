import { FileKey2, ShieldCheck, Upload, X } from 'lucide-react';
import { useId, useState } from 'react';
import { lerArquivoComoBase64 } from '../assistente.api';
import type { PropsDeEtapa } from '../assistente.tipos';
import { BOTAO_ICONE, BOTAO_SECUNDARIO, CampoSegredo, Escolha, Grupo, Nota } from '../campos';

/** Um A1 tem poucos KB; um arquivo grande assim nao e certificado. */
const TAMANHO_MAXIMO = 200 * 1024;

function SituacaoDoCertificado({
  gravado,
  arquivo,
  aoRemover,
}: {
  readonly gravado: boolean;
  readonly arquivo: string;
  readonly aoRemover: () => void;
}) {
  if (arquivo) {
    return (
      <div className="border-hairline-strong flex items-center gap-4 rounded-2xl border p-5">
        <span className="bg-surface-soft text-ink flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <FileKey2 size={19} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-body-sm text-ink block truncate font-semibold">{arquivo}</span>
          <span className="text-caption text-stone block">
            Vai para o cofre do servidor quando você salvar (F8).
          </span>
        </span>
        <button
          type="button"
          onClick={aoRemover}
          aria-label="Remover certificado selecionado"
          className={BOTAO_ICONE}
        >
          <X size={17} />
        </button>
      </div>
    );
  }
  return (
    <div className="border-hairline-light flex items-center gap-4 rounded-2xl border p-5">
      <span
        className={`bg-surface-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${gravado ? 'text-accent-teal' : 'text-stone'}`}
      >
        <ShieldCheck size={19} aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="text-body-sm text-ink block font-semibold">
          {gravado ? 'Certificado A1 guardado' : 'Nenhum certificado enviado'}
        </span>
        <span className="text-caption text-stone block">
          {gravado
            ? 'Para trocar, selecione o novo arquivo e informe a senha dele.'
            : 'Selecione o arquivo .pfx ou .p12 do certificado A1 da empresa.'}
        </span>
      </span>
    </div>
  );
}

export function AbaCertificado({ segredos, gravados, alterarSegredo }: PropsDeEtapa) {
  const idDoArquivo = useId();
  const [erro, setErro] = useState<string | null>(null);

  const escolher = async (arquivo: File | undefined) => {
    setErro(null);
    if (!arquivo) return;
    if (!/\.(pfx|p12)$/i.test(arquivo.name)) {
      setErro('Selecione um arquivo .pfx ou .p12.');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro('Arquivo grande demais para um certificado A1.');
      return;
    }
    try {
      alterarSegredo('certificateBase64', await lerArquivoComoBase64(arquivo));
      alterarSegredo('certificateFileName', arquivo.name);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível ler o arquivo.');
    }
  };
  const remover = () => {
    alterarSegredo('certificateBase64', '');
    alterarSegredo('certificateFileName', '');
    alterarSegredo('certificatePassword', '');
  };

  return (
    <Grupo titulo="Certificado digital">
      <div className="max-w-2xl space-y-6">
        <Escolha
          rotulo="Vale para"
          valor="TODOS"
          opcoes={[
            { valor: 'TODOS', rotulo: 'Todos os terminais' },
            { valor: 'TERMINAL', rotulo: 'Por terminal', desabilitada: true },
          ]}
          aoMudar={() => undefined}
        />
        <SituacaoDoCertificado
          gravado={gravados.certificado}
          arquivo={segredos.certificateFileName}
          aoRemover={remover}
        />
        <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
          <div>
            <input
              id={idDoArquivo}
              type="file"
              accept=".pfx,.p12,application/x-pkcs12"
              className="sr-only"
              onChange={(evento) => {
                void escolher(evento.target.files?.[0]);
                evento.target.value = '';
              }}
            />
            <label htmlFor={idDoArquivo} className={`${BOTAO_SECUNDARIO} w-full cursor-pointer`}>
              <Upload size={16} aria-hidden="true" /> Selecionar arquivo
            </label>
          </div>
          <CampoSegredo
            rotulo="Senha do certificado"
            gravado={gravados.senhaCertificado && !segredos.certificateBase64}
            valor={segredos.certificatePassword}
            aoMudar={(valor) => alterarSegredo('certificatePassword', valor)}
          />
        </div>
        {erro && (
          <p role="alert" className="text-body-sm text-accent-danger">
            {erro}
          </p>
        )}
        <Nota>
          Na nuvem, o Synapse guarda um certificado A1 por empresa, usado por todos os terminais.
          Arquivo e senha vão direto para o cofre cifrado do servidor; esta tela nunca os recebe de
          volta.
        </Nota>
      </div>
    </Grupo>
  );
}

import { Button, IconButton, Status, TAMANHO_DE_ICONE, Text } from '@synapse/sdl';
import { Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { LinhaDeCampos, Secao } from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { lerArquivoComoBase64 } from '../assistente.api';
import type { PropsDeEtapa } from '../assistente.tipos';
import { CampoSegredo, Escolha, Nota } from '../campos';

/** Um A1 tem poucos KB; um arquivo grande assim não é certificado. */
const TAMANHO_MAXIMO = 200 * 1024;

/** A situação do certificado numa linha de leitura — sem cartão. */
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
      <div className="flex items-center gap-3">
        <Status tone="info">Arquivo selecionado</Status>
        <Text variant="dado" className="min-w-0 truncate">
          {arquivo}
        </Text>
        <Text variant="legenda">Vai para o cofre do servidor quando você salvar (F8).</Text>
        <IconButton label="Remover certificado selecionado" density="compacta" onClick={aoRemover}>
          <X size={TAMANHO_DE_ICONE.compacta} aria-hidden="true" />
        </IconButton>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Status tone={gravado ? 'ok' : 'neutro'}>
        {gravado ? 'Certificado A1 guardado' : 'Nenhum certificado enviado'}
      </Status>
      <Text variant="legenda">
        {gravado
          ? 'Para trocar, selecione o novo arquivo e informe a senha dele.'
          : 'Selecione o arquivo .pfx ou .p12 do certificado A1 da empresa.'}
      </Text>
    </div>
  );
}

/** O `<input type=file>` fica escondido; quem a pessoa usa é um Button do SDL
 *  (antes era um `<label>` vestido de botão). */
function SeletorDeArquivo({ aoEscolher }: { readonly aoEscolher: (arquivo?: File) => void }) {
  const arquivo = useRef<HTMLInputElement>(null);
  return (
    <div className="pt-[22px]">
      <input
        ref={arquivo}
        type="file"
        accept=".pfx,.p12,application/x-pkcs12"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(evento) => {
          aoEscolher(evento.target.files?.[0]);
          evento.target.value = '';
        }}
      />
      <Button variant="secondary" onClick={() => arquivo.current?.click()}>
        <Upload size={TAMANHO_DE_ICONE.padrao} aria-hidden="true" /> Selecionar arquivo
      </Button>
    </div>
  );
}

export function AbaCertificado({ segredos, gravados, alterarSegredo, erroDoCampo }: PropsDeEtapa) {
  const [erro, setErro] = useState<string | null>(null);

  const escolher = async (selecionado: File | undefined) => {
    setErro(null);
    if (!selecionado) return;
    if (!/\.(pfx|p12)$/i.test(selecionado.name)) {
      setErro('Selecione um arquivo .pfx ou .p12.');
      return;
    }
    if (selecionado.size > TAMANHO_MAXIMO) {
      setErro('Arquivo grande demais para um certificado A1.');
      return;
    }
    try {
      alterarSegredo('certificateBase64', await lerArquivoComoBase64(selecionado));
      alterarSegredo('certificateFileName', selecionado.name);
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
    <Secao titulo="Certificado digital">
      <div className="space-y-5">
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
        <LinhaDeCampos>
          <SeletorDeArquivo aoEscolher={(selecionado) => void escolher(selecionado)} />
          <CampoSegredo
            rotulo="Senha do certificado"
            className={L.longo}
            campo="segredo.certificatePassword"
            erro={erroDoCampo('segredo.certificatePassword')}
            gravado={gravados.senhaCertificado && !segredos.certificateBase64}
            valor={segredos.certificatePassword}
            aoMudar={(valor) => alterarSegredo('certificatePassword', valor)}
          />
        </LinhaDeCampos>
        {erro && (
          <Text variant="corpo" tone="perigo" role="alert">
            {erro}
          </Text>
        )}
        <Nota>
          Na nuvem, o Synapse guarda um certificado A1 por empresa, usado por todos os terminais.
          Arquivo e senha vão direto para o cofre cifrado do servidor; esta tela nunca os recebe de
          volta.
        </Nota>
      </div>
    </Secao>
  );
}

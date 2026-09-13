import { readFileSync } from 'node:fs';
import { FirebaseConfigError, FirebaseCredentialFileError } from '../common/errors';

export interface AdminCredentials {
  readonly projectId: string;
  readonly clientEmail: string;
  readonly privateKey: string;
}

/** Os emuladores nao verificam credencial real: so precisam saber o projectId.
 *  Ligado sempre que uma das variaveis padrao do Firebase CLI estiver presente. */
export const isEmulatorMode = (env: NodeJS.ProcessEnv = process.env): boolean =>
  Boolean(env['FIRESTORE_EMULATOR_HOST'] ?? env['FIREBASE_AUTH_EMULATOR_HOST']);

interface ArquivoDaContaDeServico {
  readonly type?: unknown;
  readonly project_id?: unknown;
  readonly client_email?: unknown;
  readonly private_key?: unknown;
}

/** Le a chave da conta de servico do arquivo JSON baixado do console.
 *
 *  E o jeito recomendado: o arquivo fica fora do repositorio (e fora de pasta
 *  sincronizada com nuvem), so o caminho vai para o .env. Colar a chave privada
 *  numa variavel espalha o segredo por historico de terminal, prints e backups.
 *
 *  Recusa arquivo de outro projeto: apontar a API de desenvolvimento para a
 *  chave de producao por engano e o tipo de erro que so se descobre tarde. */
export const readServiceAccountFile = (
  caminho: string,
  projectIdEsperado?: string,
): AdminCredentials => {
  let bruto: string;
  try {
    bruto = readFileSync(caminho, 'utf8');
  } catch {
    throw new FirebaseCredentialFileError(
      caminho,
      'o arquivo não existe. Gere a chave em Console do Firebase > Configurações do projeto > ' +
        'Contas de serviço > Gerar nova chave privada',
    );
  }
  let conteudo: ArquivoDaContaDeServico;
  try {
    conteudo = JSON.parse(bruto) as ArquivoDaContaDeServico;
  } catch {
    throw new FirebaseCredentialFileError(caminho, 'o arquivo não é um JSON válido');
  }

  const {
    type,
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  } = conteudo;
  if (type !== 'service_account') {
    throw new FirebaseCredentialFileError(caminho, 'não é uma chave de conta de serviço');
  }
  if (typeof projectId !== 'string' || typeof clientEmail !== 'string') {
    throw new FirebaseCredentialFileError(caminho, 'faltam project_id ou client_email');
  }
  if (typeof privateKey !== 'string' || !privateKey.includes('PRIVATE KEY')) {
    throw new FirebaseCredentialFileError(caminho, 'falta a chave privada');
  }
  if (projectIdEsperado && projectIdEsperado !== projectId) {
    throw new FirebaseCredentialFileError(
      caminho,
      `a chave é do projeto "${projectId}", mas FIREBASE_PROJECT_ID é "${projectIdEsperado}"`,
    );
  }
  return { projectId, clientEmail, privateKey };
};

/** Le as credenciais do Admin SDK, na ordem:
 *
 *  1. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY — para servidor que injeta
 *     segredo por variavel (Cloud Run com Secret Manager, por exemplo). A chave
 *     chega com o \n escapado — o par barra+n, nao a quebra de linha — entao o
 *     escape e desfeito aqui. Sem isso o Admin SDK recusa o PEM.
 *  2. GOOGLE_APPLICATION_CREDENTIALS — caminho do JSON da conta de servico, o
 *     nome padrao das ferramentas do Google. E o recomendado na maquina de
 *     desenvolvimento. */
export const readAdminCredentials = (env: NodeJS.ProcessEnv = process.env): AdminCredentials => {
  const projectId = env['FIREBASE_PROJECT_ID'] || undefined;
  const clientEmail = env['FIREBASE_CLIENT_EMAIL'];
  const privateKey = env['FIREBASE_PRIVATE_KEY'];
  const arquivo = env['GOOGLE_APPLICATION_CREDENTIALS'];

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') };
  }
  if (arquivo && !clientEmail && !privateKey) {
    return readServiceAccountFile(arquivo, projectId);
  }

  const missing = [
    projectId ? null : 'FIREBASE_PROJECT_ID',
    clientEmail ? null : 'FIREBASE_CLIENT_EMAIL',
    privateKey ? null : 'FIREBASE_PRIVATE_KEY',
  ].filter((name): name is string => name !== null);
  throw new FirebaseConfigError(
    arquivo ? missing : [...missing, 'ou GOOGLE_APPLICATION_CREDENTIALS'],
  );
};

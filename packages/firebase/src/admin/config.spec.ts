import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { FirebaseConfigError, FirebaseCredentialFileError } from '../common/errors';
import { readAdminCredentials, readServiceAccountFile } from './config';

/** Como a chave sai de um .env: o \n e o par barra+n, nao a quebra de linha. */
const CHAVE_ESCAPADA = '-----BEGIN PRIVATE KEY-----\\nMIIB\\n-----END PRIVATE KEY-----\\n';

/** Como o Admin SDK precisa receber: um PEM de verdade, em varias linhas. */
const CHAVE_PEM = '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----\n';

const completo = {
  FIREBASE_PROJECT_ID: 'synapse-dev',
  FIREBASE_CLIENT_EMAIL: 'admin@synapse-dev.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: CHAVE_ESCAPADA,
} satisfies NodeJS.ProcessEnv;

describe('readAdminCredentials', () => {
  it('le as tres credenciais do ambiente', () => {
    const { projectId, clientEmail } = readAdminCredentials({ ...completo });
    expect(projectId).toBe('synapse-dev');
    expect(clientEmail).toBe('admin@synapse-dev.iam.gserviceaccount.com');
  });

  it('desfaz o escape da chave privada, senao o Admin SDK recusa o PEM', () => {
    const { privateKey } = readAdminCredentials({ ...completo });

    expect(privateKey).toBe(CHAVE_PEM);
    expect(privateKey).not.toContain('\\n');
    expect(privateKey.split('\n')).toHaveLength(4);
  });

  it('preserva a chave que ja vem com quebra de linha de verdade', () => {
    const { privateKey } = readAdminCredentials({
      ...completo,
      FIREBASE_PRIVATE_KEY: CHAVE_PEM,
    });
    expect(privateKey).toBe(CHAVE_PEM);
  });

  it.each([['FIREBASE_PROJECT_ID'], ['FIREBASE_CLIENT_EMAIL'], ['FIREBASE_PRIVATE_KEY']])(
    'recusa o ambiente sem %s, dizendo o que falta',
    (ausente) => {
      const env = { ...completo, [ausente]: undefined };
      expect(() => readAdminCredentials(env)).toThrow(FirebaseConfigError);
      expect(() => readAdminCredentials(env)).toThrow(ausente);
    },
  );

  it('lista todas as credenciais que faltam de uma vez', () => {
    expect(() => readAdminCredentials({})).toThrow(
      /FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY/,
    );
  });

  it('trata string vazia como ausente', () => {
    expect(() => readAdminCredentials({ ...completo, FIREBASE_PROJECT_ID: '' })).toThrow(
      FirebaseConfigError,
    );
  });
});

describe('chave da conta de servico em arquivo', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'synapse-credencial-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));

  const gravar = (nome: string, conteudo: unknown): string => {
    const caminho = join(pasta, nome);
    writeFileSync(caminho, typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo));
    return caminho;
  };

  const contaDeServico = {
    type: 'service_account',
    project_id: 'synapse-erp-5b092',
    client_email: 'firebase-adminsdk@synapse-erp-5b092.iam.gserviceaccount.com',
    private_key: CHAVE_PEM,
  };

  it('le a chave do arquivo apontado por GOOGLE_APPLICATION_CREDENTIALS', () => {
    const caminho = gravar('ok.json', contaDeServico);
    const credenciais = readAdminCredentials({
      FIREBASE_PROJECT_ID: 'synapse-erp-5b092',
      GOOGLE_APPLICATION_CREDENTIALS: caminho,
    });
    expect(credenciais).toEqual({
      projectId: 'synapse-erp-5b092',
      clientEmail: contaDeServico.client_email,
      privateKey: CHAVE_PEM,
    });
  });

  it('sem FIREBASE_PROJECT_ID, usa o projeto do proprio arquivo', () => {
    const caminho = gravar('sem-projeto.json', contaDeServico);
    expect(readAdminCredentials({ GOOGLE_APPLICATION_CREDENTIALS: caminho }).projectId).toBe(
      'synapse-erp-5b092',
    );
  });

  it('recusa a chave de outro projeto, para nao apontar para producao por engano', () => {
    const caminho = gravar('outro.json', { ...contaDeServico, project_id: 'synapse-producao' });
    expect(() => readServiceAccountFile(caminho, 'synapse-erp-5b092')).toThrow(
      /é do projeto "synapse-producao"/,
    );
  });

  it('recusa arquivo que nao e chave de conta de servico', () => {
    const caminho = gravar('web.json', { apiKey: 'AIza...', projectId: 'synapse-erp-5b092' });
    expect(() => readServiceAccountFile(caminho)).toThrow(FirebaseCredentialFileError);
  });

  it('diz onde gerar a chave quando o arquivo nao existe', () => {
    expect(() => readServiceAccountFile(join(pasta, 'nao-existe.json'))).toThrow(
      /não existe\. Gere a chave em Console do Firebase/,
    );
  });

  it('recusa JSON quebrado sem mostrar o conteudo', () => {
    const quebrado = gravar('quebrado.json', '{"private_key": "-----BEGIN PRIVATE KEY-----');
    expect(() => readServiceAccountFile(quebrado)).toThrow(/não é um JSON válido/);
    expect(() => readServiceAccountFile(quebrado)).not.toThrow(/BEGIN PRIVATE KEY/);
  });

  it('variaveis explicitas continuam valendo antes do arquivo', () => {
    const caminho = gravar('ignorado.json', { ...contaDeServico, project_id: 'outro' });
    expect(
      readAdminCredentials({ ...completo, GOOGLE_APPLICATION_CREDENTIALS: caminho }).projectId,
    ).toBe('synapse-dev');
  });
});

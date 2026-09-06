import { describe, expect, it } from 'vitest';
import { FirebaseConfigError } from '../common/errors';
import { readAdminCredentials } from './config';

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

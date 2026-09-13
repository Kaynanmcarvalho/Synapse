#!/usr/bin/env node
/** Confere, antes do `pnpm dev`, se a API tem como falar com o Firebase.
 *
 *  Sem isso o `turbo run dev` sobe as três telas, a API morre no boot com um
 *  stack trace que some na rolagem, e a tela de login só diz "verifique se a API
 *  está no ar" — sem dizer o que fazer. Aqui a falha aparece antes de tudo, com
 *  o motivo e as duas saídas.
 *
 *  Nunca imprime segredo: só caminho, nome de variável e o que falta. */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Le o .env.local da raiz do jeito que a API lê (ConfigModule): o que já está
 *  no ambiente vence o arquivo. */
const lerEnv = () => {
  const valores = {};
  for (const arquivo of ['.env.local', '.env']) {
    let conteudo;
    try {
      conteudo = readFileSync(join(raiz, arquivo), 'utf8');
    } catch {
      continue;
    }
    for (const linha of conteudo.split(/\r?\n/)) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith('#')) continue;
      const igual = limpa.indexOf('=');
      if (igual < 1) continue;
      const chave = limpa.slice(0, igual).trim();
      if (valores[chave] === undefined) {
        valores[chave] = limpa
          .slice(igual + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  }
  return { ...valores, ...process.env };
};

const env = lerEnv();
const projeto = env.FIREBASE_PROJECT_ID || '(sem FIREBASE_PROJECT_ID)';
const arquivoDaChave = env.GOOGLE_APPLICATION_CREDENTIALS;

const avisar = (motivo, comoResolver) => {
  process.stderr.write(
    `\nSynapse: a API não vai subir — ${motivo}\n\n${comoResolver}\n\n` +
      'Esta conferência roda antes do `pnpm dev`. Para pular, use `turbo run dev`.\n\n',
  );
  process.exit(1);
};

const noEmulador = env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST;
if (noEmulador) {
  process.stdout.write('ambiente: emulador do Firebase — a API não precisa de chave.\n');
  process.exit(0);
}

const comEmulador =
  '  1) Desenvolver no emulador, sem segredo nenhum:\n' +
  '       pnpm dev:emulador\n' +
  '     Entra com teste.rbac@synapse.dev / Senha123! (o seed cria o usuário).\n';

const comChave = (caminho) =>
  `  2) Falar com o projeto real (${projeto}):\n` +
  '     Console do Firebase > Configurações do projeto > Contas de serviço >\n' +
  '     Gerar nova chave privada, e salvar o arquivo em\n' +
  `       ${caminho}\n` +
  '     Ele fica fora do repositório de propósito: chave nunca é versionada.\n';

// Chave por variável (servidor com Secret Manager) dispensa o arquivo.
if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_PROJECT_ID) {
  process.stdout.write(`ambiente: projeto ${projeto}, credencial por variável.\n`);
  process.exit(0);
}

if (!arquivoDaChave) {
  avisar(
    'falta a credencial do Firebase (GOOGLE_APPLICATION_CREDENTIALS não está no .env.local).',
    `${comEmulador}\n${comChave('C:/Users/<voce>/.synapse/<projeto>-admin.json')}`,
  );
}

let conteudo;
try {
  conteudo = readFileSync(arquivoDaChave, 'utf8');
} catch {
  avisar(
    `a chave da conta de serviço não está mais em\n  ${arquivoDaChave}\n` +
      '  (GOOGLE_APPLICATION_CREDENTIALS, no .env.local da raiz).',
    `${comEmulador}\n${comChave(arquivoDaChave)}`,
  );
}

let chave;
try {
  chave = JSON.parse(conteudo);
} catch {
  avisar(`a chave em ${arquivoDaChave} não é um JSON válido.`, comChave(arquivoDaChave));
}

if (chave.type !== 'service_account' || !chave.private_key) {
  avisar(
    `o arquivo em ${arquivoDaChave} não é uma chave de conta de serviço.`,
    comChave(arquivoDaChave),
  );
}
if (env.FIREBASE_PROJECT_ID && chave.project_id !== env.FIREBASE_PROJECT_ID) {
  avisar(
    `a chave é do projeto "${chave.project_id}", mas FIREBASE_PROJECT_ID é "${env.FIREBASE_PROJECT_ID}".`,
    comChave(arquivoDaChave),
  );
}

process.stdout.write(`ambiente: projeto ${projeto}, chave de serviço encontrada.\n`);

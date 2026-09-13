#!/usr/bin/env node
/** Diz com que banco a API vai falar nesta máquina — e por quê.
 *
 *  Usado pelo `pnpm dev` (que escolhe o modo) e pelo `pnpm dev:cloud` (que exige
 *  o projeto real). Sem isso, a falta da chave vira um stack trace no meio da
 *  saída do turbo e a tela de login só diz "verifique se a API está no ar".
 *
 *  Nunca imprime segredo: só caminho, nome de variável e o motivo. */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lê o .env.local da raiz como a API lê (ConfigModule): o que já está no
 *  ambiente vence o arquivo. */
export const lerEnv = () => {
  const valores = {};
  for (const arquivo of ['.env.local', '.env']) {
    let conteudo;
    try {
      conteudo = readFileSync(join(RAIZ, arquivo), 'utf8');
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

const chaveDoArquivo = (caminho, projetoEsperado) => {
  let conteudo;
  try {
    conteudo = readFileSync(caminho, 'utf8');
  } catch {
    return `a chave da conta de serviço não está em\n    ${caminho}\n  (caminho de GOOGLE_APPLICATION_CREDENTIALS, no .env.local da raiz).`;
  }
  let chave;
  try {
    chave = JSON.parse(conteudo);
  } catch {
    return `a chave em ${caminho} não é um JSON válido.`;
  }
  if (chave.type !== 'service_account' || !chave.private_key) {
    return `o arquivo em ${caminho} não é uma chave de conta de serviço.`;
  }
  if (projetoEsperado && chave.project_id !== projetoEsperado) {
    return `a chave é do projeto "${chave.project_id}", mas FIREBASE_PROJECT_ID é "${projetoEsperado}".`;
  }
  return null;
};

/** O modo desta máquina:
 *  - `emulador`: o processo já está dentro do `firebase emulators:exec`;
 *  - `nuvem`: há credencial válida para o projeto real;
 *  - `sem-credencial`: falta a chave — com o motivo e o que fazer. */
export const diagnosticar = (env = lerEnv()) => {
  const projeto = env.FIREBASE_PROJECT_ID || null;
  if (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST) {
    return { modo: 'emulador', projeto: env.GCLOUD_PROJECT || 'demo-synapse' };
  }
  if (projeto && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return { modo: 'nuvem', projeto, origem: 'variáveis de ambiente' };
  }
  const arquivo = env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!arquivo) {
    return {
      modo: 'sem-credencial',
      projeto,
      motivo:
        'não há credencial do Firebase configurada (nem GOOGLE_APPLICATION_CREDENTIALS ' +
        'nem FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY no .env.local da raiz).',
    };
  }
  const problema = chaveDoArquivo(arquivo, projeto);
  return problema
    ? { modo: 'sem-credencial', projeto, motivo: problema, arquivo }
    : { modo: 'nuvem', projeto, origem: arquivo };
};

/** Como passar a falar com o projeto real — o único passo que depende de você. */
export const comoUsarNuvem = (diagnostico) =>
  'Console do Firebase > Configurações do projeto > Contas de serviço >\n' +
  'Gerar nova chave privada, e salvar o arquivo em\n' +
  `  ${diagnostico.arquivo ?? 'C:/Users/<você>/.synapse/<projeto>-admin.json'}\n` +
  'Ele fica fora do repositório de propósito: chave nunca é versionada.';

/** As duas saídas, no texto que aparece no terminal. */
export const comoResolver = (diagnostico) =>
  '  1) Desenvolver no emulador, sem segredo nenhum:\n' +
  '       pnpm dev:emulador\n' +
  '     Entra com teste.rbac@synapse.dev / Senha123! (o seed cria o usuário).\n\n' +
  `  2) Falar com o projeto real${diagnostico.projeto ? ` (${diagnostico.projeto})` : ''}:\n` +
  comoUsarNuvem(diagnostico)
    .split('\n')
    .map((linha) => `     ${linha}`)
    .join('\n');

/** Rodado direto (`pnpm dev:cloud`), exige o projeto real e para se faltar chave. */
const executadoDireto = () =>
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (executadoDireto()) {
  const diagnostico = diagnosticar();
  if (diagnostico.modo === 'sem-credencial') {
    process.stderr.write(
      `\nSynapse: a API não vai subir — ${diagnostico.motivo}\n\n${comoResolver(diagnostico)}\n\n` +
        'Para subir sem chave, use `pnpm dev` (escolhe o emulador sozinho) ou `pnpm dev:emulador`.\n\n',
    );
    process.exit(1);
  }
  const onde =
    diagnostico.modo === 'emulador'
      ? 'emulador do Firebase — a API não precisa de chave.'
      : `projeto ${diagnostico.projeto} (credencial: ${diagnostico.origem}).`;
  process.stdout.write(`ambiente: ${onde}\n`);
}

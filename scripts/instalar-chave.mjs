#!/usr/bin/env node
/** Coloca a chave da conta de serviço no lugar certo, em qualquer máquina do time.
 *
 *  O arquivo baixado do Console do Firebase precisa ficar fora do repositório e
 *  fora de pasta sincronizada com nuvem — é a chave que abre o banco de produção.
 *  Este script confere que é a chave do projeto certo, copia para o caminho
 *  padrão, fecha as permissões e aponta o .env.local para lá.
 *
 *  uso:
 *    pnpm chave:instalar                        (pega o JSON mais novo em Downloads)
 *    pnpm chave:instalar caminho/da/chave.json
 *
 *  Nunca imprime o conteúdo do arquivo. */

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { diagnosticar, lerEnv, RAIZ } from './verificar-ambiente.mjs';

const parar = (mensagem) => {
  process.stderr.write(`\nchave: ${mensagem}\n\n`);
  process.exit(1);
};

const env = lerEnv();

/** O projeto esperado: o do .env.local, senão o padrão do .firebaserc. */
const projetoEsperado = () => {
  if (env.FIREBASE_PROJECT_ID) return env.FIREBASE_PROJECT_ID;
  try {
    const rc = JSON.parse(readFileSync(join(RAIZ, '.firebaserc'), 'utf8'));
    return rc.projects?.default ?? null;
  } catch {
    return null;
  }
};

const lerChave = (caminho) => {
  let conteudo;
  try {
    conteudo = readFileSync(caminho, 'utf8');
  } catch {
    return { erro: 'não consegui ler o arquivo' };
  }
  let chave;
  try {
    chave = JSON.parse(conteudo);
  } catch {
    return { erro: 'não é um JSON válido' };
  }
  if (chave.type !== 'service_account' || !chave.private_key || !chave.client_email) {
    return { erro: 'não é uma chave de conta de serviço do Firebase' };
  }
  return { chave };
};

/** Sem caminho no comando, procura em Downloads a chave mais nova do projeto. */
const procurarEmDownloads = (projeto) => {
  const pastas = [join(homedir(), 'Downloads'), join(homedir(), 'Transferências')];
  const candidatos = [];
  for (const pasta of pastas) {
    if (!existsSync(pasta)) continue;
    for (const nome of readdirSync(pasta)) {
      if (!nome.toLowerCase().endsWith('.json')) continue;
      const caminho = join(pasta, nome);
      const { chave } = lerChave(caminho);
      if (chave && (!projeto || chave.project_id === projeto)) {
        candidatos.push({ caminho, em: statSync(caminho).mtimeMs });
      }
    }
  }
  return candidatos.sort((a, b) => b.em - a.em)[0]?.caminho ?? null;
};

const SINCRONIZADAS = /onedrive|dropbox|google ?drive|icloud|nextcloud/i;

const projeto = projetoEsperado();
const informado = process.argv[2];
const origem = informado ? resolve(informado) : procurarEmDownloads(projeto);

if (!origem) {
  parar(
    'não achei a chave. Baixe em Console do Firebase > Configurações do projeto >\n' +
      '  Contas de serviço > Gerar nova chave privada (o seletor Node/Java/Python só\n' +
      '  muda o exemplo de código; o arquivo é o mesmo), e rode de novo — ou passe o\n' +
      '  caminho: pnpm chave:instalar "C:/Users/voce/Downloads/arquivo.json"',
  );
}

const { chave, erro } = lerChave(origem);
if (erro) parar(`${origem}: ${erro}.`);
if (projeto && chave.project_id !== projeto) {
  parar(
    `essa chave é do projeto "${chave.project_id}", e este repositório usa "${projeto}".\n` +
      '  Gere a chave dentro do projeto certo.',
  );
}

const destino = env.GOOGLE_APPLICATION_CREDENTIALS
  ? resolve(env.GOOGLE_APPLICATION_CREDENTIALS)
  : join(homedir(), '.synapse', `${chave.project_id}-admin.json`);

if (destino.toLowerCase().startsWith(RAIZ.toLowerCase())) {
  parar(`o destino ${destino} está dentro do repositório. A chave não pode ser versionada.`);
}
if (SINCRONIZADAS.test(destino)) {
  parar(
    `o destino ${destino} está numa pasta sincronizada com nuvem.\n` +
      '  Escolha um caminho local, como C:/Users/<você>/.synapse/.',
  );
}

mkdirSync(join(destino, '..'), { recursive: true });
copyFileSync(origem, destino);

// So o dono le a chave. Se o icacls nao existir (fora do Windows), segue.
let permissoes = 'não alteradas';
try {
  execFileSync('icacls', [destino, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:F`], {
    stdio: 'ignore',
  });
  permissoes = `só ${process.env.USERNAME}`;
} catch {
  /* noop: em outro sistema, o umask do arquivo ja vale */
}

// O .env.local e local e ignorado pelo git: aponta para a chave quando falta.
const envLocal = join(RAIZ, '.env.local');
const conteudoEnv = existsSync(envLocal) ? readFileSync(envLocal, 'utf8') : '';
let aviso = null;
if (!/^GOOGLE_APPLICATION_CREDENTIALS=/m.test(conteudoEnv)) {
  const prefixo = conteudoEnv.endsWith('\n') || conteudoEnv === '' ? '' : '\n';
  appendFileSync(
    envLocal,
    `${prefixo}GOOGLE_APPLICATION_CREDENTIALS=${destino.replace(/\\/g, '/')}\n` +
      (/^FIREBASE_PROJECT_ID=/m.test(conteudoEnv)
        ? ''
        : `FIREBASE_PROJECT_ID=${chave.project_id}\n`),
  );
} else if (resolve(env.GOOGLE_APPLICATION_CREDENTIALS ?? '') !== destino) {
  aviso =
    `o .env.local aponta para ${env.GOOGLE_APPLICATION_CREDENTIALS}.\n` +
    `  Troque por ${destino.replace(/\\/g, '/')} ou mova a chave para lá.`;
}

process.stdout.write(
  `\nchave instalada.\n` +
    `  projeto   : ${chave.project_id}\n` +
    `  conta     : ${chave.client_email}\n` +
    `  arquivo   : ${destino}\n` +
    `  permissões: ${permissoes}\n` +
    (aviso ? `\n  atenção: ${aviso}\n` : '') +
    `\nApague a cópia baixada (${basename(origem)}) da pasta de Downloads.\n` +
    'Agora `pnpm dev` sobe contra o projeto real.\n\n',
);

const depois = diagnosticar();
process.stdout.write(
  depois.modo === 'nuvem'
    ? `conferido: o ambiente aponta para ${depois.projeto}.\n\n`
    : `atenção: o ambiente ainda não aponta para o projeto real (${depois.motivo ?? depois.modo}).\n\n`,
);

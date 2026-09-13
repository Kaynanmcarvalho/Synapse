#!/usr/bin/env node
/** Quem consegue entrar no projeto real, e o que falta para quem não consegue.
 *
 *  Entrar no Synapse pede três coisas, e faltar uma dá erro diferente na tela:
 *
 *  1. conta no Authentication do projeto (senão "E-mail ou senha incorretos");
 *  2. claim `tenantId` no token (senão "Seu usuário ainda não está vinculado a
 *     uma empresa");
 *  3. vínculo ativo em `tenants/{tenant}/users/{uid}` com um cargo (senão
 *     "Seu usuário não tem acesso a esta empresa").
 *
 *  Só lê — para conceder acesso existe o `pnpm seed:cloud-admin`.
 *
 *  uso: pnpm acesso:conferir            (todas as contas do projeto)
 *       pnpm acesso:conferir a@b.com    (só essas) */

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { diagnosticar, RAIZ } from './verificar-ambiente.mjs';

const requireDoPacote = createRequire(join(RAIZ, 'packages', 'firebase', 'package.json'));
const { initializeApp, getApps, cert } = requireDoPacote('firebase-admin/app');
const { getAuth } = requireDoPacote('firebase-admin/auth');
const { getFirestore } = requireDoPacote('firebase-admin/firestore');
const { readFileSync } = await import('node:fs');

const ambiente = diagnosticar();
if (ambiente.modo !== 'nuvem') {
  process.stderr.write(
    `\nacesso: este comando é do projeto real, e o ambiente está em "${ambiente.modo}".\n` +
      `  ${ambiente.motivo ?? ''}\n\n`,
  );
  process.exit(1);
}

const caminhoDaChave = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? ambiente.origem;
const chave = JSON.parse(readFileSync(caminhoDaChave, 'utf8'));
const app =
  getApps()[0] ??
  initializeApp({ credential: cert(chave), projectId: chave.project_id }, 'conferir-acesso');
const auth = getAuth(app);
const db = getFirestore(app);

const pedidos = process.argv.slice(2).filter((a) => a.includes('@'));

const contas = [];
if (pedidos.length > 0) {
  for (const email of pedidos) {
    try {
      contas.push(await auth.getUserByEmail(email));
    } catch {
      contas.push({ email, faltando: true });
    }
  }
} else {
  let pagina = await auth.listUsers(1000);
  contas.push(...pagina.users);
  while (pagina.pageToken) {
    pagina = await auth.listUsers(1000, pagina.pageToken);
    contas.push(...pagina.users);
  }
}

const tenants = await db.collection('tenants').get();
process.stdout.write(
  `\nprojeto ${chave.project_id} — ${tenants.size} empresa(s): ` +
    `${tenants.docs.map((t) => `${t.id} (${t.data().name ?? 'sem nome'})`).join(', ') || 'nenhuma'}\n\n`,
);

for (const conta of contas) {
  if (conta.faltando) {
    process.stdout.write(`${conta.email}\n  NÃO tem conta no Authentication deste projeto.\n\n`);
    continue;
  }
  const claim = conta.customClaims?.tenantId ?? null;
  const vinculos = [];
  for (const tenant of tenants.docs) {
    const doc = await db.doc(`tenants/${tenant.id}/users/${conta.uid}`).get();
    if (doc.exists) {
      const dados = doc.data();
      vinculos.push(`${tenant.id}: ${dados.status} · ${(dados.roleIds ?? []).join(', ')}`);
    }
  }
  const entra = Boolean(claim) && vinculos.some((v) => v.includes('active'));
  process.stdout.write(
    `${conta.email ?? conta.uid}${conta.disabled ? ' (desativado)' : ''}\n` +
      `  uid   : ${conta.uid}\n` +
      `  claim : ${claim ?? 'sem tenantId — a API recusa o token'}\n` +
      `  vínculo: ${vinculos.join(' | ') || 'nenhum'}\n` +
      `  entra : ${entra ? 'sim' : 'NÃO'}\n` +
      (entra
        ? ''
        : `  resolver: pnpm seed:cloud-admin --usuario ${conta.email ?? '<email>'}:${conta.uid} --confirmar\n`) +
      '\n',
  );
}

await app.delete();

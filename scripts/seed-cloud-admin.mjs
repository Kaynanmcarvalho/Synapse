#!/usr/bin/env node
/** Da acesso de dono do SaaS a usuarios que ja existem no Firebase Auth do projeto
 *  real. Cria o tenant e a empresa se faltarem, grava o vinculo do usuario com o
 *  cargo SUPER_ADMIN_SAAS e escreve a claim `tenantId` no token — sem ela a API
 *  responde "Token sem tenant ativo".
 *
 *  Ao contrario do seed-dev, este script fala com o projeto de verdade. Por isso
 *  recusa rodar contra emulador e so grava com `--confirmar`; sem a flag, mostra
 *  o que faria.
 *
 *  Uso:
 *    node scripts/seed-cloud-admin.mjs --usuario email:uid [--usuario email:uid] \
 *      [--tenant synapse] [--nome "Synapse"] [--empresa "Synapse"] \
 *      [--cnpj 00000000000000] [--senha "SenhaForte1!"] [--confirmar]
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const requireDoPacote = createRequire(join(raiz, 'packages', 'firebase', 'package.json'));
const { initializeApp, getApps, cert } = requireDoPacote('firebase-admin/app');
const { getAuth } = requireDoPacote('firebase-admin/auth');
const { getFirestore, FieldValue } = requireDoPacote('firebase-admin/firestore');

const lerArgumentos = (argv) => {
  const opcoes = { usuarios: [], confirmar: false };
  for (let i = 0; i < argv.length; i += 1) {
    const atual = argv[i];
    const proximo = argv[i + 1];
    if (atual === '--confirmar') opcoes.confirmar = true;
    else if (atual === '--usuario' && proximo) {
      const separador = proximo.lastIndexOf(':');
      opcoes.usuarios.push({
        email: proximo.slice(0, separador).trim(),
        uid: proximo.slice(separador + 1).trim(),
      });
      i += 1;
    } else if (atual?.startsWith('--') && proximo) {
      opcoes[atual.slice(2)] = proximo;
      i += 1;
    }
  }
  return opcoes;
};

const opcoes = lerArgumentos(process.argv.slice(2));
const TENANT_ID = opcoes.tenant ?? 'synapse';
const TENANT_NOME = opcoes.nome ?? 'Synapse';
const EMPRESA_ID = opcoes.empresa_id ?? 'matriz';
const EMPRESA_NOME = opcoes.empresa ?? TENANT_NOME;
const CNPJ = (opcoes.cnpj ?? '').replace(/\D/g, '');

if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'seed-cloud-admin: este script e do projeto real; limpe FIRESTORE_EMULATOR_HOST e ' +
      'FIREBASE_AUTH_EMULATOR_HOST (ou use scripts/seed-dev.mjs no emulador).',
  );
  process.exit(1);
}
if (opcoes.usuarios.length === 0) {
  console.error('seed-cloud-admin: informe ao menos um --usuario email:uid');
  process.exit(1);
}

const credencial = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
};
if (!credencial.projectId || !credencial.clientEmail || !credencial.privateKey) {
  console.error(
    'seed-cloud-admin: faltam FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ou FIREBASE_PRIVATE_KEY ' +
      'no .env.local da raiz.',
  );
  process.exit(1);
}

const app = getApps()[0] ?? initializeApp({ credential: cert(credencial) });
const auth = getAuth(app);
const db = getFirestore(app);

/** Confere no Auth quem e cada UID antes de dar acesso de dono. */
const conferirUsuarios = async () => {
  const conferidos = [];
  for (const alvo of opcoes.usuarios) {
    const usuario = await auth.getUser(alvo.uid).catch((erro) => {
      throw new Error(`UID ${alvo.uid} nao existe no projeto (${erro.code ?? erro.message})`);
    });
    if (alvo.email && usuario.email && usuario.email.toLowerCase() !== alvo.email.toLowerCase()) {
      throw new Error(
        `UID ${alvo.uid} e de ${usuario.email}, nao de ${alvo.email}. Confira antes de dar acesso de dono.`,
      );
    }
    conferidos.push({
      ...alvo,
      email: usuario.email ?? alvo.email,
      nome: usuario.displayName ?? '',
    });
  }
  return conferidos;
};

const gravar = async (usuarios) => {
  const agora = new Date();
  const autoria = { createdBy: usuarios[0].uid, updatedBy: usuarios[0].uid, updatedAt: agora };

  await db
    .doc(`tenants/${TENANT_ID}`)
    .set(
      {
        id: TENANT_ID,
        name: TENANT_NOME,
        status: 'active',
        timezone: 'America/Sao_Paulo',
        ...autoria,
      },
      { merge: true },
    );
  await db.doc(`tenants/${TENANT_ID}/company/${EMPRESA_ID}`).set(
    {
      id: EMPRESA_ID,
      tenantId: TENANT_ID,
      legalName: EMPRESA_NOME,
      tradeName: EMPRESA_NOME,
      ...(CNPJ ? { cnpj: CNPJ } : {}),
      ...autoria,
    },
    { merge: true },
  );

  for (const usuario of usuarios) {
    await db.doc(`tenants/${TENANT_ID}/users/${usuario.uid}`).set(
      {
        authUid: usuario.uid,
        email: usuario.email ?? null,
        status: 'active',
        roleIds: ['SUPER_ADMIN_SAAS'],
        branchIds: [],
        warehouseIds: [],
        mfaRequired: false,
        createdAt: FieldValue.serverTimestamp(),
        ...autoria,
      },
      { merge: true },
    );
    const atual = (await auth.getUser(usuario.uid)).customClaims ?? {};
    if (atual.tenantId !== TENANT_ID) {
      await auth.setCustomUserClaims(usuario.uid, { ...atual, tenantId: TENANT_ID });
    }
    if (opcoes.senha) await auth.updateUser(usuario.uid, { password: opcoes.senha });
    console.log(`  ok  ${usuario.email ?? usuario.uid} -> SUPER_ADMIN_SAAS no tenant ${TENANT_ID}`);
  }
};

const main = async () => {
  const usuarios = await conferirUsuarios();
  console.log(`Projeto: ${credencial.projectId}`);
  console.log(`Tenant:  ${TENANT_ID} (${TENANT_NOME}) / empresa ${EMPRESA_ID} (${EMPRESA_NOME})`);
  for (const usuario of usuarios) {
    console.log(`Usuario: ${usuario.email ?? '(sem e-mail)'} — ${usuario.uid}`);
  }
  if (opcoes.senha) console.log('Senha:   sera redefinida para a informada em --senha');

  if (!opcoes.confirmar) {
    console.log('\nNada foi gravado. Rode de novo com --confirmar para aplicar.');
    return;
  }
  console.log('\nGravando...');
  await gravar(usuarios);
  console.log('\nPronto. Saia e entre de novo no web-erp para o token pegar a claim do tenant.');
};

main().catch((erro) => {
  console.error('seed-cloud-admin falhou:', erro.message ?? erro);
  process.exit(1);
});

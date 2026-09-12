#!/usr/bin/env node
/** Carga minima para o `pnpm dev` ser usavel, e nao so subir.
 *
 *  O Emulator Suite comeca vazio: sem usuario, ninguem entra no web-erp, e sem
 *  claim de tenant e vinculo gravado a API recusa toda rota com 401/403. Este
 *  script cria o usuario que as telas ja trazem preenchido e o liga a uma empresa
 *  de desenvolvimento com o cargo ADMIN_EMPRESA.
 *
 *  Idempotente: rodar de novo nao duplica nada. Recusa qualquer alvo que nao seja
 *  o emulador — nunca encosta num projeto Firebase real. */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'seed-dev: FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST ausentes. ' +
      'Este script so roda contra o Firebase Emulator Suite (use `pnpm dev`).',
  );
  process.exit(1);
}

// firebase-admin e dependencia de @synapse/firebase, nao da raiz: resolver a
// partir do pacote funciona com o layout do pnpm, sem depender de hoisting.
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const requireDoPacote = createRequire(join(raiz, 'packages', 'firebase', 'package.json'));
const { initializeApp, getApps } = requireDoPacote('firebase-admin/app');
const { getAuth } = requireDoPacote('firebase-admin/auth');
const { getFirestore } = requireDoPacote('firebase-admin/firestore');

const PROJETO = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? 'demo-synapse';

/** Os mesmos valores que as telas do web-erp trazem preenchidos no login. */
const USUARIO = { email: 'teste.rbac@synapse.dev', senha: 'Senha123!', nome: 'Teste RBAC' };
const TENANT_ID = 'tenant-dev';
const EMPRESA_ID = 'empresa-dev';

const app = getApps()[0] ?? initializeApp({ projectId: PROJETO });
const auth = getAuth(app);
const db = getFirestore(app);

const garantirUsuario = async () => {
  try {
    return await auth.getUserByEmail(USUARIO.email);
  } catch (erro) {
    if (erro?.code !== 'auth/user-not-found') throw erro;
    return auth.createUser({
      email: USUARIO.email,
      password: USUARIO.senha,
      displayName: USUARIO.nome,
      emailVerified: true,
    });
  }
};

const main = async () => {
  const usuario = await garantirUsuario();
  const agora = new Date();
  const autoria = { createdBy: usuario.uid, updatedBy: usuario.uid, updatedAt: agora };

  // merge: true mantem o que o desenvolvedor ja alterou nas execucoes anteriores.
  await db.doc(`tenants/${TENANT_ID}`).set(
    {
      id: TENANT_ID,
      name: 'Distribuidora Dev',
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
      legalName: 'Distribuidora Dev LTDA',
      tradeName: 'Distribuidora Dev',
      cnpj: '00000000000191',
      ...autoria,
    },
    { merge: true },
  );
  // branchIds e warehouseIds vazios: usuario sem recorte, alcanca toda filial.
  await db.doc(`tenants/${TENANT_ID}/users/${usuario.uid}`).set(
    {
      authUid: usuario.uid,
      status: 'active',
      roleIds: ['ADMIN_EMPRESA'],
      branchIds: [],
      warehouseIds: [],
      mfaRequired: false,
      ...autoria,
    },
    { merge: true },
  );

  // A API le o tenant da claim do token: sem ela, "Token sem tenant ativo".
  if (usuario.customClaims?.tenantId !== TENANT_ID) {
    await auth.setCustomUserClaims(usuario.uid, { ...usuario.customClaims, tenantId: TENANT_ID });
  }

  process.stdout.write(
    `seed-dev: pronto - login ${USUARIO.email} / ${USUARIO.senha} ` +
      `(tenant ${TENANT_ID}, cargo ADMIN_EMPRESA, projeto ${PROJETO})\n`,
  );
};

main().catch((erro) => {
  console.error('seed-dev falhou:', erro);
  process.exit(1);
});

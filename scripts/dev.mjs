#!/usr/bin/env node
/** `pnpm dev` que sobe em qualquer máquina do time.
 *
 *  Com a chave do projeto real configurada, roda contra ele. Sem a chave, roda
 *  no emulador do Firebase, com o seed de desenvolvimento — em vez de subir as
 *  três telas contra uma API que morre no boot, que é o que acontecia para quem
 *  não tinha a chave baixada.
 *
 *  O modo escolhido aparece no terminal antes de qualquer coisa: trabalhar no
 *  emulador achando que está no banco real seria pior do que não subir.
 *
 *  Para forçar um dos dois: `pnpm dev:cloud` ou `pnpm dev:emulador`. */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { comoUsarNuvem, diagnosticar, RAIZ } from './verificar-ambiente.mjs';

const NUVEM = 'turbo run dev';

const emulador = () => {
  const dados = join(RAIZ, '.firebase', 'emulators');
  // --import só com a pasta existindo: numa cópia nova do repositório ela não
  // existe, e o firebase recusa importar de um caminho que não está lá.
  const importar = existsSync(dados) ? '--import=.firebase/emulators ' : '';
  return (
    'firebase emulators:exec --project demo-synapse --only auth,firestore ' +
    `${importar}--export-on-exit=.firebase/emulators ` +
    '"node scripts/seed-dev.mjs && turbo run dev"'
  );
};

const REGUA = '─'.repeat(74);

const moldura = (linhas) => `\n${REGUA}\n${linhas.join('\n')}\n${REGUA}\n\n`;

const diagnostico = diagnosticar();

let comando = NUVEM;
if (diagnostico.modo === 'nuvem') {
  process.stdout.write(
    moldura([
      `Banco: projeto Firebase ${diagnostico.projeto} (real).`,
      `Credencial: ${diagnostico.origem}.`,
      'Para trabalhar sem tocar no projeto real: pnpm dev:emulador',
    ]),
  );
} else if (diagnostico.modo === 'emulador') {
  process.stdout.write(moldura(['Banco: emulador do Firebase (já em execução).']));
} else {
  comando = emulador();
  process.stdout.write(
    moldura([
      'Banco: EMULADOR do Firebase — nada é gravado no projeto real.',
      '',
      `Motivo: ${diagnostico.motivo.replace(/\n\s*/g, ' ')}`,
      '',
      'Entre com teste.rbac@synapse.dev / Senha123! (o seed cria o usuário).',
      'Sua conta do projeto real não existe aqui dentro.',
      '',
      `Para usar o projeto real (${diagnostico.projeto ?? 'Firebase'}), baixe a chave da conta de serviço:`,
      ...comoUsarNuvem(diagnostico).split('\n'),
    ]),
  );
}

const filho = spawn(comando, { cwd: RAIZ, shell: true, stdio: 'inherit' });
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => filho.kill(sinal));
}
filho.on('exit', (codigo, sinal) => process.exit(sinal ? 1 : (codigo ?? 0)));

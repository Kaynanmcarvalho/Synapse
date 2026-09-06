import { BadRequestException } from '@nestjs/common';

/**
 * Impede que uma suíte automatizada use credenciais ou endpoints de produção.
 * A verificação fica junto da resolução dos adapters externos para cobrir
 * testes unitários, integração e E2E, mesmo quando o bootstrap HTTP não é usado.
 */
export function assertNonProductionTestTarget(
  integration: 'bancária' | 'fiscal',
  environment: string,
): void {
  if (process.env.NODE_ENV === 'test' && environment === 'PRODUCAO') {
    throw new BadRequestException(
      `Integração ${integration} de produção é proibida em teste automatizado`,
    );
  }
}

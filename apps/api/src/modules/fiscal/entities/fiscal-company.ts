import { ForbiddenException } from '@nestjs/common';

/** A empresa emitente e o proprio tenant: a config fiscal, o certificado e a
 *  numeracao moram em `tenants/{companyId}`. Aceitar outro id vindo no corpo
 *  deixaria um tenant emitir, inutilizar ou baixar DF-e com o certificado de outro. */
export function assertOwnCompany(tenantId: string, companyId: string): void {
  if (companyId !== tenantId)
    throw new ForbiddenException('A empresa informada pertence a outro tenant');
}

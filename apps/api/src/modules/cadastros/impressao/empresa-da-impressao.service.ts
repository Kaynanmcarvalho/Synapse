import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { EmpresaDaImpressao, FiscalCompanyConfig } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

type Marca = { readonly systemName?: string; readonly logoUrl?: string | null };

/** Cada campo do emitente é opcional no assistente: o nome cai para a razão
 *  social, depois para o nome do sistema na marca, e só então para "Empresa". */
// eslint-disable-next-line complexity -- um padrão por campo opcional do emitente
function empresaDaImpressao(fiscal: FiscalCompanyConfig | null, marca: Marca): EmpresaDaImpressao {
  const emitente = fiscal?.issuer ?? null;
  const endereco = emitente?.address;
  const nome = emitente?.tradeName || emitente?.legalName || marca.systemName || 'Empresa';
  return {
    nome,
    razaoSocial: emitente?.legalName || nome,
    documento: emitente?.document ?? '',
    inscricaoEstadual: fiscal?.stateRegistration || null,
    endereco: endereco
      ? [endereco.street, endereco.number, endereco.complement, endereco.district]
          .filter((parte) => Boolean(parte?.trim()))
          .join(', ')
      : '',
    cidadeUf: endereco?.cityName
      ? `${endereco.cityName} - ${fiscal?.state ?? ''}`
      : (fiscal?.state ?? ''),
    cep: endereco?.zipCode ?? '',
    telefone: emitente?.phone || emitente?.phone2 || null,
    logoUrl: marca.logoUrl ?? null,
  };
}

/** O cabeçalho dos documentos impressos (pedido de venda, cupom do balcão): o
 *  emitente do Assistente de Configuração de NF-e e a logo da marca do tenant.
 *  Só lê — quem grava é o assistente fiscal e o painel do SaaS. */
@Injectable()
export class EmpresaDaImpressaoService {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  async empresa(tenantId: string): Promise<EmpresaDaImpressao> {
    const [config, experiencia] = await Promise.all([
      this.db.doc(`tenants/${tenantId}/fiscal/config`).get(),
      this.db.doc(`tenantExperiences/${tenantId}`).get(),
    ]);
    const fiscal = config.exists ? (config.data() as FiscalCompanyConfig) : null;
    const marca = experiencia.exists ? ((experiencia.data()?.['branding'] ?? {}) as Marca) : {};
    return empresaDaImpressao(fiscal, marca);
  }
}

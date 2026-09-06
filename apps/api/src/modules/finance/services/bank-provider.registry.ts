import { BadRequestException, Injectable } from '@nestjs/common';
import type { BankAccountConfig, BankProvider } from '@synapse/types';
import { SecretVault } from '../../../common/crypto/secret-vault';
import { ItauProvider } from '../providers/itau.provider';
import { MockBankProvider } from '../providers/mock-bank.provider';
import { SicrediProvider } from '../providers/sicredi.provider';

/** Cofre dos segredos bancarios. Chave-mestra propria, separada da fiscal: o
 *  vazamento de uma nao entrega a outra. */
export const BANKING_VAULT = new SecretVault('BANKING_MASTER_KEY');

/** Resolve a conta configurada para um provider de verdade.
 *
 *  Este e o unico lugar do sistema que sabe que Sicredi e Itau existem. O
 *  financeiro conhece BankProvider e mais nada — e por isso que adicionar um
 *  banco novo e escrever a classe e acrescentar um `case` aqui, sem tocar em
 *  contas a receber, a pagar ou conciliacao (§56). */
@Injectable()
export class BankProviderRegistry {
  constructor(private readonly mock: MockBankProvider) {}

  resolve(config: BankAccountConfig): BankProvider {
    if (!config.ativo) {
      throw new BadRequestException(`Conta bancária ${config.apelido} está desativada`);
    }

    // MOCK atende qualquer banco: e o ambiente em que o financeiro roda
    // inteiro enquanto o contrato do banco real nao chega.
    if (config.environment === 'MOCK') return this.mock;

    if (!config.baseUrl) {
      throw new BadRequestException(
        `Conta ${config.apelido}: ambiente ${config.environment} sem baseUrl. ` +
          `O endereço de cada banco vem da documentação oficial — ver docs/BANKING.md.`,
      );
    }

    switch (config.bankId) {
      case 'SICREDI': {
        if (!config.sicredi) throw new BadRequestException('Configuração Sicredi ausente');
        return new SicrediProvider(
          config.sicredi,
          {
            clientId: BANKING_VAULT.read(config.sicredi.clientIdSecretRef).toString('utf8'),
            clientSecret: BANKING_VAULT.read(config.sicredi.clientSecretSecretRef).toString('utf8'),
            certificado: BANKING_VAULT.read(config.sicredi.certificadoSecretRef),
          },
          config.environment,
          config.baseUrl,
        );
      }
      case 'ITAU': {
        if (!config.itau) throw new BadRequestException('Configuração Itaú ausente');
        return new ItauProvider(
          config.itau,
          {
            clientId: BANKING_VAULT.read(config.itau.clientIdSecretRef).toString('utf8'),
            clientSecret: BANKING_VAULT.read(config.itau.clientSecretSecretRef).toString('utf8'),
            certificado: BANKING_VAULT.read(config.itau.certificadoSecretRef),
          },
          config.environment,
          config.baseUrl,
        );
      }
      default:
        throw new BadRequestException(
          `${config.bankId} ainda não tem implementação. A interface já comporta o banco: ` +
            `falta a classe do provider e o contrato oficial — ver docs/BANKING.md.`,
        );
    }
  }
}

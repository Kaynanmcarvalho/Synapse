import { Injectable } from '@nestjs/common';
import type {
  FiscalConsultResult,
  FiscalEventCommand,
  FiscalIssueCommand,
  FiscalProvider,
  FiscalProviderResult,
} from '@synapse/types';
import { createHash, randomUUID } from 'node:crypto';

@Injectable()
export class MockFiscalProvider implements FiscalProvider {
  private readonly results = new Map<string, FiscalProviderResult>();
  async issueNFe(command: FiscalIssueCommand) {
    return this.issue(command);
  }
  async issueNFCe(command: FiscalIssueCommand) {
    return this.issue(command);
  }
  async issueMDFe(command: FiscalIssueCommand) {
    return this.issue(command);
  }
  async cancelDocument(command: FiscalEventCommand) {
    return this.event(command, 'CANCELLED', 'Cancelamento homologado');
  }
  async cancelNFCe(command: FiscalEventCommand) {
    return this.cancelDocument(command);
  }
  async correctNFe(command: FiscalEventCommand) {
    return this.event(command, 'AUTHORIZED', 'Carta de correção registrada');
  }
  async consultDocument(accessKey: string): Promise<FiscalConsultResult> {
    const found = [...this.results.values()].find((result) => result.accessKey === accessKey);
    if (!found) throw new Error('Documento não encontrado');
    return { ...found, raw: { mock: true } };
  }
  async downloadXml(providerId: string) {
    return [...this.results.values()].find((result) => result.providerId === providerId)?.xml ?? '';
  }
  async downloadNFCeXml(providerId: string) {
    return this.downloadXml(providerId);
  }
  async getDanfe(xml: string) {
    return Buffer.from(`DANFE MOCK\n${xml}`);
  }
  async getNFCeDanfe(xml: string) {
    return this.getDanfe(xml);
  }
  async checkNFCeJob(jobId: string) {
    return [...this.results.values()].find((result) => result.jobId === jobId) ?? null;
  }
  async queryDFe() {
    return [];
  }
  async manifestDFe() {
    return {
      status: 'AUTHORIZED' as const,
      providerId: randomUUID(),
      jobId: null,
      accessKey: null,
      protocol: Date.now().toString(),
      xml: null,
      code: '135',
      message: 'Manifestação registrada',
    };
  }
  async closeMDFe() {
    return this.mdfeEvent('Encerramento homologado');
  }
  async cancelMDFe() {
    return { ...this.mdfeEvent('Cancelamento homologado'), status: 'CANCELLED' as const };
  }
  async checkMDFeJob(jobId: string) {
    return (
      [...this.results.values()].find((result) => result.jobId === jobId) ??
      this.mdfeEvent('Autorizado')
    );
  }
  async getDamdfe(id: string) {
    return Buffer.from(`DAMDFE MOCK ${id}`);
  }
  private mdfeEvent(message: string): FiscalProviderResult {
    return {
      status: 'AUTHORIZED',
      providerId: randomUUID(),
      jobId: null,
      accessKey: '1'.repeat(44),
      protocol: Date.now().toString(),
      xml: null,
      code: '100',
      message,
    };
  }
  private issue(command: FiscalIssueCommand): FiscalProviderResult {
    const previous = this.results.get(command.idempotencyKey);
    if (previous) return previous;
    const accessKey = createHash('sha256')
      .update(`${command.companyId}:${command.series}:${command.number}`)
      .digest('hex')
      .replace(/\D/g, '')
      .padEnd(44, '0')
      .slice(0, 44);
    const result = {
      status: 'AUTHORIZED' as const,
      providerId: randomUUID(),
      jobId: null,
      accessKey,
      protocol: Date.now().toString(),
      xml: `<nfeProc><chNFe>${accessKey}</chNFe></nfeProc>`,
      code: '100',
      message: 'Autorizado o uso da NF-e',
    };
    this.results.set(command.idempotencyKey, result);
    return result;
  }
  private event(
    command: FiscalEventCommand,
    status: 'AUTHORIZED' | 'CANCELLED',
    message: string,
  ): FiscalProviderResult {
    return {
      status,
      providerId: randomUUID(),
      jobId: null,
      accessKey: command.accessKey,
      protocol: command.protocol,
      xml: `<procEventoNFe>${message}</procEventoNFe>`,
      code: '135',
      message,
    };
  }
}

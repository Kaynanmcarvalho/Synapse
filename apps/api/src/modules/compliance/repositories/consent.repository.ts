import { Injectable } from '@nestjs/common';
import type { ConsentRecord } from '@synapse/types';

@Injectable()
export class ConsentRepository {
  private readonly records: ConsentRecord[] = [];

  append(record: ConsentRecord): ConsentRecord {
    this.records.push(record);
    return record;
  }

  /** Historico completo — LGPD exige provar quando o consentimento mudou,
   *  nao so o estado atual. */
  history(tenantId: string, subjectId: string): ConsentRecord[] {
    return this.records
      .filter((record) => record.tenantId === tenantId && record.subjectId === subjectId)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }

  /** O ultimo registro por finalidade decide o estado vigente. */
  current(tenantId: string, subjectId: string): ConsentRecord[] {
    const byPurpose = new Map<string, ConsentRecord>();
    for (const record of this.history(tenantId, subjectId)) {
      byPurpose.set(record.purpose, record);
    }
    return [...byPurpose.values()];
  }
}
